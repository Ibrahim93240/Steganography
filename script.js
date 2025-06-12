document.addEventListener("DOMContentLoaded", function () {
  const encodeInput = document.getElementById("encodeInput");
  const decodeInput = document.getElementById("decodeInput");
  const canvasEncode = document.getElementById("canvasEncode");
  const canvasDecode = document.getElementById("canvasDecode");
  const messageInput = document.getElementById("messageInput");
  const encodePassword = document.getElementById("encodePassword");
  const watermarkInput = document.getElementById("watermarkInput");
  const decodePassword = document.getElementById("decodePassword");
  const decodedMessageOutput = document.getElementById("decodedMessage");
  const downloadLink = document.getElementById("downloadLink");
  const encodeDrop = document.getElementById("encodeDrop");
  const decodeDrop = document.getElementById("decodeDrop");
  const encodeLoading = document.getElementById("encodeLoading");
  const decodeLoading = document.getElementById("decodeLoading");
  const encodeStatus = document.getElementById("encodeStatus");
  const decodeStatus = document.getElementById("decodeStatus");
  const encodeBtn = document.getElementById("encodeBtn");
  const decodeBtn = document.getElementById("decodeBtn");

  let originalImage = null;

  encodeDrop.addEventListener("click", () => encodeInput.click());
  decodeDrop.addEventListener("click", () => decodeInput.click());

  encodeInput.addEventListener("change", handleEncodeImageUpload);
  decodeInput.addEventListener("change", handleDecodeImageUpload);

  setupDragAndDrop(encodeDrop, encodeInput);
  setupDragAndDrop(decodeDrop, decodeInput);

  function setupDragAndDrop(dropZone, input) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragging");
    });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragging");
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event("change"));
      }
    });
  }

  function resizeAndDrawImage(img, canvas) {
    const ctx = canvas.getContext("2d");
    const MAX_WIDTH = 800;
    const MAX_HEIGHT = 800;
    let width = img.width;
    let height = img.height;
    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
      width = width * scale;
      height = height * scale;
    }
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
  }

  function handleEncodeImageUpload(event) {
    const file = event.target.files[0];
    if (!file || !file.type.match(/image\/(png|jpeg)/)) {
      showStatus(encodeStatus, "Please upload a PNG or JPG image", "error");
      return;
    }
    encodeLoading.classList.remove("hidden");
    encodeStatus.classList.add("hidden");
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        originalImage = img;
        resizeAndDrawImage(img, canvasEncode);
        canvasEncode.classList.add("active");
        encodeLoading.classList.add("hidden");
      };
      img.onerror = () => showStatus(encodeStatus, "Error loading image", "error");
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleDecodeImageUpload(event) {
    const file = event.target.files[0];
    if (!file || !file.type.match(/image\/(png|jpeg)/)) {
      showStatus(decodeStatus, "Please upload a PNG or JPG image", "error");
      return;
    }
    decodeLoading.classList.remove("hidden");
    decodeStatus.classList.add("hidden");
    decodedMessageOutput.innerHTML = "";
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        resizeAndDrawImage(img, canvasDecode);
        canvasDecode.style.display = "block";
        decodeLoading.classList.add("hidden");
      };
      img.onerror = () => showStatus(decodeStatus, "Error loading image", "error");
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function showStatus(element, message, type) {
    element.textContent = message;
    element.className = "status-message " + type;
  }

  function textToBinary(str) {
    return Array.from(str).reduce((acc, char) =>
      acc + char.charCodeAt(0).toString(2).padStart(8, '0'), '');
  }

  function binaryToText(binary) {
    let text = '';
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.slice(i, i + 8);
      if (byte.length < 8) break;
      const charCode = parseInt(byte, 2);
      if (charCode === 0) break;
      text += String.fromCharCode(charCode);
    }
    return text;
  }

  window.encode = function () {
    if (!originalImage) return showStatus(encodeStatus, "Please upload an image first", "error");
    const message = messageInput.value.trim();
    const password = encodePassword.value.trim();
    const watermark = watermarkInput.value.trim();
    if (!message || !password) return showStatus(encodeStatus, "Please enter message and password", "error");

    encodeBtn.disabled = true;
    encodeLoading.classList.remove("hidden");
    encodeStatus.classList.add("hidden");

    try {
      const payload = watermark ? `${message}::${watermark}` : message;
      const encrypted = CryptoJS.AES.encrypt(payload, password).toString();
      const binaryMessage = textToBinary(encrypted + "\0");

      const ctx = canvasEncode.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvasEncode.width, canvasEncode.height);
      const data = imageData.data;

      const maxBits = data.length / 4 * 3;
      if (binaryMessage.length > maxBits) {
        return showStatus(encodeStatus, `Message too long for image. Max bits: ${maxBits}, needed: ${binaryMessage.length}`, "error");
      }

      let binaryIndex = 0;
      for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
          if (binaryIndex < binaryMessage.length) {
            data[i + j] = (data[i + j] & ~1) | parseInt(binaryMessage[binaryIndex]);
            binaryIndex++;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);

      if (watermark) {
        ctx.font = "20px Poppins";
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(watermark, canvasEncode.width - 12, canvasEncode.height - 12);
      }

      downloadLink.href = canvasEncode.toDataURL();
      downloadLink.style.display = "inline-block";
      showStatus(encodeStatus, "Message encoded successfully!", "success");
    } catch (err) {
      showStatus(encodeStatus, "Error during encoding: " + err.message, "error");
    } finally {
      encodeBtn.disabled = false;
      encodeLoading.classList.add("hidden");
    }
  };

  window.decode = function () {
    const password = decodePassword.value.trim();
    if (!password) return showStatus(decodeStatus, "Please enter the password", "error");

    decodeBtn.disabled = true;
    decodeLoading.classList.remove("hidden");
    decodeStatus.classList.add("hidden");
    decodedMessageOutput.innerHTML = "";

    try {
      const ctx = canvasDecode.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvasDecode.width, canvasDecode.height);
      const data = imageData.data;

      let binary = "";
      for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
          binary += (data[i + j] & 1).toString();
        }
      }

      const decodedText = binaryToText(binary);
      if (!decodedText) return showStatus(decodeStatus, "No hidden message found or corrupted data", "error");

      const decrypted = CryptoJS.AES.decrypt(decodedText, password).toString(CryptoJS.enc.Utf8);
      if (!decrypted) return showStatus(decodeStatus, "Wrong password or corrupted message", "error");

      const parts = decrypted.split("::");
      const message = parts[0];
      const watermark = parts.length > 1 ? parts.slice(1).join("::") : "";

      decodedMessageOutput.innerHTML = `
        <h3>\ud83d\udd13 Secret Message</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
        ${watermark ? `<hr><p><strong>Watermark:</strong><br>${watermark}</p>` : ''}
      `;

      showStatus(decodeStatus, "Message decoded successfully!", "success");
    } catch (err) {
      showStatus(decodeStatus, "Error during decoding: " + err.message, "error");
    } finally {
      decodeBtn.disabled = false;
      decodeLoading.classList.add("hidden");
    }
  };

  window.showPanel = function (panel) {
  const encodePanel = document.getElementById("encodePanel");
  const decodePanel = document.getElementById("decodePanel");
  const encodeButton = document.getElementById("encodeButton");
  const decodeButton = document.getElementById("decodeButton");

  encodePanel.classList.remove("active");
  decodePanel.classList.remove("active");
  encodeButton.classList.remove("active");
  decodeButton.classList.remove("active");

  if (panel === "encode") {
    encodePanel.classList.add("active");
    encodeButton.classList.add("active");
    encodePassword.focus();
  } else {
    decodePanel.classList.add("active");
    decodeButton.classList.add("active");
    decodePassword.focus();
  }

  setTimeout(() => {
    document.body.classList.toggle("force-theme-refresh");
    document.body.offsetHeight;
    document.body.classList.toggle("force-theme-refresh");
  }, 10);
};


  document.getElementById("toggleDark").addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });
});
