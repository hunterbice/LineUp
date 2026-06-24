import { esc } from "../utils/dom.js";

function personIcon() {
  return '<svg viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.5 3.2-7 7.5-7s6.8 2.5 7.5 7"/></svg>';
}

function cameraIcon() {
  return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3"/></svg>';
}

export function renderAvatarEditor(prefix, avatarUrl) {
  const hasPhoto = typeof avatarUrl === "string" && avatarUrl.startsWith("data:image/");
  const visual = hasPhoto ? `<img src="${esc(avatarUrl)}" alt="Profile photo">` : personIcon();
  const label = hasPhoto ? "Edit profile photo" : "Add profile photo";
  return `<div class="avatarEditor" id="${esc(prefix)}AvatarEditor"><div class="avatarCircle ${hasPhoto ? "hasPhoto" : ""}">${visual}</div><button type="button" class="avatarCamera" aria-label="${label}" onclick="openPhotoSheet('${esc(prefix)}')">${cameraIcon()}</button></div>`;
}

export function renderPhotoSourceSheet({ target = "edit", hasPhoto = false } = {}) {
  const safeTarget = target === "setup" ? "setup" : "edit";
  return `<div class="photoActionSheet" data-photo-target="${safeTarget}"><div class="sheetHandle" aria-hidden="true"></div><h2>Profile Photo</h2><p class="sheetIntro">Choose a photo, then position it before saving.</p><button class="photoSheetAction" type="button" onclick="openPhotoInput('camera')">${cameraIcon()}<span>Take Photo</span></button><button class="photoSheetAction" type="button" onclick="openPhotoInput('library')"><span class="photoActionGlyph" aria-hidden="true">▧</span><span>Choose from Library</span></button>${hasPhoto ? '<button class="photoSheetAction dangerText" type="button" onclick="removeCurrentPhoto()"><span class="photoActionGlyph" aria-hidden="true">−</span><span>Remove Current Photo</span></button>' : ""}<button class="photoSheetCancel" type="button" onclick="closeSheet()">Cancel</button><input class="visuallyHidden" id="photoCameraInput" type="file" accept="image/*" capture="environment" aria-label="Take profile photo" onchange="handleAvatarFile(this,'${safeTarget}')"><input class="visuallyHidden" id="photoLibraryInput" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="Choose profile photo from library" onchange="handleAvatarFile(this,'${safeTarget}')"></div>`;
}

export function renderPhotoCropSheet() {
  return `<div class="photoCropSheet"><div class="sheetHandle" aria-hidden="true"></div><h2>Position Photo</h2><p class="sheetIntro">Drag to choose what appears in your profile circle.</p><div class="photoCropFrame"><canvas id="photoCropCanvas" width="512" height="512" tabindex="0" role="img" aria-label="Profile photo crop preview. Drag or use arrow keys to reposition."></canvas></div><p class="photoCropHint">Drag to reposition</p><div class="sheetActions"><button class="secondaryBtn" type="button" onclick="cancelPhotoCrop()">Cancel</button><button class="submit" id="saveCroppedPhoto" type="button" onclick="saveCroppedPhoto()">Save Photo</button></div></div>`;
}
