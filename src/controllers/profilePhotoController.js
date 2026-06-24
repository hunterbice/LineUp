import { compressProfileCrop, prepareProfileImage } from "../utils/profileImage.js";

export function createProfilePhotoController(deps) {
  let target = "edit";
  let prepared = null;
  let image = null;
  let offsetX = 0;
  let offsetY = 0;
  let drag = null;

  function sheet() { return deps.sheetElement(); }
  function card() { return deps.sheetCardElement(); }
  function openSheet() { sheet().classList.add("open"); }

  function open(nextTarget = "edit") {
    target = nextTarget === "setup" ? "setup" : "edit";
    card().innerHTML = deps.renderSourceSheet({ target, hasPhoto: Boolean(deps.currentAvatar()) });
    openSheet();
  }

  function openInput(kind) {
    const input = document.getElementById(kind === "camera" ? "photoCameraInput" : "photoLibraryInput");
    if (input) input.click();
  }

  function clampOffsets(canvas) {
    if (!prepared) return;
    const scale = Math.max(canvas.width / prepared.width, canvas.height / prepared.height);
    const width = prepared.width * scale;
    const height = prepared.height * scale;
    offsetX = Math.max(-(width - canvas.width) / 2, Math.min((width - canvas.width) / 2, offsetX));
    offsetY = Math.max(-(height - canvas.height) / 2, Math.min((height - canvas.height) / 2, offsetY));
  }

  function draw() {
    const canvas = document.getElementById("photoCropCanvas");
    if (!canvas || !prepared || !image) return;
    clampOffsets(canvas);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const scale = Math.max(canvas.width / prepared.width, canvas.height / prepared.height);
    const width = prepared.width * scale;
    const height = prepared.height * scale;
    const x = (canvas.width - width) / 2 + offsetX;
    const y = (canvas.height - height) / 2 + offsetY;
    context.fillStyle = "#E5EAF2";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, x, y, width, height);
  }

  function moveBy(dx, dy) {
    offsetX += dx;
    offsetY += dy;
    draw();
  }

  function bindCrop() {
    const canvas = document.getElementById("photoCropCanvas");
    if (!canvas) return;
    canvas.addEventListener("pointerdown", (event) => {
      drag = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("dragging");
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const factor = canvas.width / Math.max(1, canvas.clientWidth);
      const dx = (event.clientX - drag.x) * factor;
      const dy = (event.clientY - drag.y) * factor;
      drag = { x: event.clientX, y: event.clientY };
      moveBy(dx, dy);
    });
    const stop = () => { drag = null; canvas.classList.remove("dragging"); };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    canvas.addEventListener("keydown", (event) => {
      const moves = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] };
      if (!moves[event.key]) return;
      event.preventDefault();
      moveBy(moves[event.key][0], moves[event.key][1]);
    });
  }

  async function handleFile(input, nextTarget) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    target = nextTarget === "setup" ? "setup" : "edit";
    deps.showToast("Preparing photo…");
    try {
      prepared = await prepareProfileImage(file);
      offsetX = 0;
      offsetY = 0;
      image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("This photo could not be decoded. Choose a JPEG, PNG, or WebP image."));
        image.src = prepared.dataUrl;
      });
      card().innerHTML = deps.renderCropSheet();
      openSheet();
      bindCrop();
      draw();
    } catch (error) {
      deps.logError("profile_photo_processing_failed", error);
      deps.showToast(error && error.message ? error.message : "Could not process this photo");
      open(target);
    } finally {
      input.value = "";
    }
  }

  async function save() {
    const canvas = document.getElementById("photoCropCanvas");
    const button = document.getElementById("saveCroppedPhoto");
    if (!canvas) return;
    if (button) { button.disabled = true; button.textContent = "Saving…"; }
    try {
      const avatar = compressProfileCrop(canvas);
      await deps.saveAvatar(avatar, target);
      deps.closeSheet();
      deps.showToast("Profile photo saved");
    } catch (error) {
      deps.logError("profile_photo_save_failed", error);
      deps.showToast(error && error.message ? error.message : "Could not save this photo");
      if (button) { button.disabled = false; button.textContent = "Save Photo"; }
    }
  }

  async function remove() {
    try {
      await deps.removeAvatar(target);
      deps.closeSheet();
      deps.showToast("Profile photo removed");
    } catch (error) {
      deps.logError("profile_photo_remove_failed", error);
      deps.showToast("Could not remove profile photo");
    }
  }

  function cancelCrop() { open(target); }

  return { open, openInput, handleFile, save, remove, cancelCrop, testHooks: { moveBy, draw } };
}
