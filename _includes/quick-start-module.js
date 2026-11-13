// Keys are Substrings as diplayed by navigator.platform
var supportedOperatingSystems = new Map([
  ['linux', 'linux'],
  ['mac', 'macos'],
  ['win', 'windows'],
]);

var archInfoMap = new Map([
  ['cuda', {title: "CUDA", platforms: new Set(['linux', 'windows'])}],
  ['rocm', {title: "ROCm", platforms: new Set(['linux'])}],
  ['accnone', {title: "CPU", platforms: new Set(['linux', 'macos', 'windows'])}]
]);

let version_map={{ ACC ARCH MAP }}
let stable_version={{ VERSION }};

var default_selected_os = getAnchorSelectedOS() || getDefaultSelectedOS();
var opts = {
  cuda: getPreferredCuda(default_selected_os),
  os: default_selected_os,
  pm: 'pip',
  language: 'python',
  ptbuild: 'stable',
};

var supportedCloudPlatforms = [
  'aws',
  'google-cloud',
  'microsoft-azure',
  'lightning-studios',
];

// pytorch.org keeps its own copy of the chooser markup, which may lack the
// ROCm alpha box; clone it from the ROCm box.
if (!document.getElementById("rocm.alpha")) {
  var rocmBox = document.getElementById("rocm5.x");
  if (rocmBox) {
    var alphaBox = rocmBox.cloneNode(true);
    alphaBox.id = "rocm.alpha";
    alphaBox.style.display = "none";
    rocmBox.after(alphaBox);
  }
}

var os = $(".os > .option");
var package = $(".package > .option");
var language = $(".language > .option");
var cuda = $(".cuda > .option");
var ptbuild = $(".ptbuild > .option");

os.on("click", function() {
  selectedOption(os, this, "os");
});
package.on("click", function() {
  selectedOption(package, this, "pm");
});
language.on("click", function() {
  selectedOption(language, this, "language");
});
cuda.on("click", function() {
  selectedOption(cuda, this, "cuda");
});
ptbuild.on("click", function() {
  selectedOption(ptbuild, this, "ptbuild")
});

// Pre-select user's operating system
$(function() {
  var userOsOption = document.getElementById(opts.os);
  var userCudaOption = document.getElementById(opts.cuda);
  if (userOsOption) {
    $(userOsOption).trigger("click");
  }
  if (userCudaOption) {
    $(userCudaOption).trigger("click");
  }
});


// determine os (mac, linux, windows) based on user's platform
function getDefaultSelectedOS() {
  var platform = navigator.platform.toLowerCase();
  for (var [navPlatformSubstring, os] of supportedOperatingSystems.entries()) {
    if (platform.indexOf(navPlatformSubstring) !== -1) {
      return os;
    }
  }
  // Just return something if user platform is not in our supported map
  return supportedOperatingSystems.values().next().value;
}

// determine os based on location hash
function getAnchorSelectedOS() {
  var anchor = location.hash;
  var ANCHOR_REGEX = /^#[^ ]+$/;
  // Look for anchor in the href
  if (!ANCHOR_REGEX.test(anchor)) {
    return false;
  }
  // Look for anchor with OS in the first portion
  var testOS = anchor.slice(1).split("-")[0];
  for (var [navPlatformSubstring, os] of supportedOperatingSystems.entries()) {
    if (testOS.indexOf(navPlatformSubstring) !== -1) {
      return os;
    }
  }
  return false;
}

// determine CUDA version based on OS
function getPreferredCuda(os) {
  // Only CPU builds are currently available for MacOS
  if (os == 'macos') {
    return 'accnone';
  }
  return 'cuda.x';
}

// Disable compute platform not supported on OS
function disableUnsupportedPlatforms(os) {

  if(opts.ptbuild == "preview")
    archMap = version_map.nightly
  else
    archMap = version_map.release

  for (const [arch_key, info] of archInfoMap) {
    var elems = document.querySelectorAll('[id^="'+arch_key+'"]');
    if (elems == null) {
      console.log("Failed to find element for architecture " + arch_key);
      return;
    }
    for (var i=0; i < elems.length;i++) {
      var supported = info.platforms.has(os);
      elems[i].style.textDecoration = supported ? "" : "line-through";

      // Officially supported arch but not available
      if(!archMap[elems[i].id]) {
        elems[i].style.textDecoration =  "line-through";
      }
    }
  }
}

// Change compute versions depending on build type
function changeVersion(ptbuild) {

  if(ptbuild == "preview")
    archMap = version_map.nightly
  else
    archMap = version_map.release

  for (const [arch_key, info] of archInfoMap) {
    var elems = document.querySelectorAll('[id^="'+arch_key+'"]');
    for (var i=0; i < elems.length;i++) {
      var arch = archMap[elems[i].id];
      if(arch) {
        elems[i].style.display = "";
        elems[i].style.textDecoration = "";
        elems[i].children[0].textContent = [info.title].concat(arch.slice(1)).join(" ");
      } else if (arch_key == "cuda" || elems[i].id == "rocm.alpha") {
        // The channel ships fewer versions than there are boxes.
        elems[i].style.display = "none";
      } else {
        elems[i].style.textDecoration = "line-through";
      }
    }
  }
  layoutComputeOptions();
  var stable_element = document.getElementById("stable");
  stable_element.children[0].textContent = stable_version;
}

// Split the row's 12 columns across the visible boxes, giving leftover
// columns to the ROCm boxes (longest labels) and then CPU, and move the
// selection off a hidden box.
function layoutComputeOptions() {
  var elems = Array.from(cuda);
  var visible = elems.filter(function(e) { return e.style.display != "none"; });
  if (visible.length == 0) {
    return;
  }
  var base = Math.floor(12 / visible.length);
  var extra = 12 - base * visible.length;
  var widened = visible.filter(function(e) { return e.id.indexOf("rocm") == 0; })
    .concat(visible.filter(function(e) { return e.id == "accnone"; }))
    .slice(0, extra);
  for (var i = 0; i < elems.length; i++) {
    elems[i].className = elems[i].className.replace(/\bcol-md-\d+\b/g, "").trim();
    var width = base + (widened.indexOf(elems[i]) >= 0 ? 1 : 0);
    elems[i].classList.add("col-md-" + width);
  }
  var selected = document.getElementById(opts.cuda);
  if (selected && selected.style.display == "none") {
    var fallback = opts.cuda == "rocm.alpha" ? document.getElementById("rocm5.x") : null;
    if (!fallback || fallback.style.display == "none") {
      fallback = visible[0];
    }
    $(cuda).removeClass("selected");
    $(fallback).addClass("selected");
    opts.cuda = fallback.id;
  }
}



// Change accnone name depending on OS type
function changeAccNoneName(osname) {
  var accnone_element = document.getElementById("accnone");
  if (accnone_element == null) {
    console.log("Failed to find accnone element");
    return;
  }
  if (osname == "macos") {
    accnone_element.children[0].textContent = "Default";
  } else {
    accnone_element.children[0].textContent = "CPU";
  }
}

function selectedOption(option, selection, category) {
  $(option).removeClass("selected");
  $(selection).addClass("selected");
  opts[category] = selection.id;
  if (category === "pm") {
    var elements = document.getElementsByClassName("language")[0].children;
    if (selection.id !== "libtorch" && elements["cplusplus"].classList.contains("selected")) {
      $(elements["cplusplus"]).removeClass("selected");
      $(elements["python"]).addClass("selected");
      opts["language"] = "python";
    } else if (selection.id == "libtorch") {
      for (var i = 0; i < elements.length; i++) {
        if (elements[i].id === "cplusplus") {
          $(elements[i]).addClass("selected");
          opts["language"] = "cplusplus";
        } else {
          $(elements[i]).removeClass("selected");
        }
      }
    }
  } else if (category === "language") {
    var elements = document.getElementsByClassName("package")[0].children;
    if (selection.id !== "cplusplus" && elements["libtorch"].classList.contains("selected")) {
      $(elements["libtorch"]).removeClass("selected");
      $(elements["pip"]).addClass("selected");
      opts["pm"] = "pip";
    } else if (selection.id == "cplusplus") {
      for (var i = 0; i < elements.length; i++) {
        if (elements[i].id === "libtorch") {
          $(elements[i]).addClass("selected");
          opts["pm"] = "libtorch";
        } else {
          $(elements[i]).removeClass("selected");
        }
      }
    }
  } else if (category == "ptbuild") {
    changeVersion(opts.ptbuild);
    //make sure unsupported platforms are disabled
    disableUnsupportedPlatforms(opts.os);
  }
  commandMessage(buildMatcher());
  if (category === "os") {
    disableUnsupportedPlatforms(opts.os);
    display(opts.os, 'installation', 'os');
  }
  changeAccNoneName(opts.os);
}

function display(selection, id, category) {
  var container = document.getElementById(id);
  // Check if there's a container to display the selection
  if (container === null) {
    return;
  }
  var elements = container.getElementsByClassName(category);
  for (var i = 0; i < elements.length; i++) {
    if (elements[i].classList.contains(selection)) {
      $(elements[i]).addClass("selected");
    } else {
      $(elements[i]).removeClass("selected");
    }
  }
}

function buildMatcher() {
  return (
    opts.ptbuild.toLowerCase() +
    "," +
    opts.pm.toLowerCase() +
    "," +
    opts.os.toLowerCase() +
    "," +
    opts.cuda.toLowerCase() +
    "," +
    opts.language.toLowerCase()
  );
}

// Cloud Partners sub-menu toggle listeners
$("[data-toggle='cloud-dropdown']").on("click", function(e) {
  if ($(this).hasClass("open")) {
    $(this).removeClass("open");
    // If you deselect a current drop-down item, don't display it's info any longer
    display(null, 'cloud', 'platform');
  } else {
    $("[data-toggle='cloud-dropdown'].open").removeClass("open");
    $(this).addClass("open");
    var cls = $(this).find(".cloud-option-body")[0].className;
    for (var i = 0; i < supportedCloudPlatforms.length; i++) {
      if (cls.includes(supportedCloudPlatforms[i])) {
        display(supportedCloudPlatforms[i], 'cloud', 'platform');
      }
    }
  }
});

function commandMessage(key) {
  var object = {{ installMatrix }};

  if (!object.hasOwnProperty(key)) {
    $("#command").html(
      "<pre> # Follow instructions at this URL: https://github.com/pytorch/pytorch#from-source </pre>"
    );
  } else if (key.indexOf("lts") == 0  && key.indexOf('rocm') < 0) {
    $("#command").html("<pre>" + object[key] + "</pre>");
  } else {
    $("#command").html("<pre>" + object[key] + "</pre>");
  }
}

// Set cuda version right away
changeVersion("stable")
