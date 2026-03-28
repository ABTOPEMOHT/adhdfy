(async function GifManager() {
    if (!Spicetify.Platform || !Spicetify.Topbar || !Spicetify.PopupModal) {
        setTimeout(GifManager, 100);
        return;
    }

    if (!document.getElementById("gif-manager-style")) {
        const style = document.createElement("style");
        style.id = "gif-manager-style";
        style.innerHTML = `
            generic-modal.gif-manager-info-active .os-scrollbar {
                display: none !important;
            }
            generic-modal.gif-manager-info-active *::-webkit-scrollbar {
                width: 0px !important;
                display: none !important;
            }
            .gif-manager-slider {
                -webkit-appearance: none;
                background: transparent;
            }
            .gif-manager-slider::-webkit-slider-runnable-track {
                height: 4px;
                border-radius: 2px;
                background: var(--spice-button-disabled);
            }
            .gif-manager-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 12px;
                width: 12px;
                border-radius: 50%;
                background: var(--spice-button);
                cursor: pointer;
                margin-top: -4px;
                box-shadow: 0 0 5px rgba(0,0,0,0.2);
            }
            @keyframes gifManagerRainbow {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            .gif-manager-rainbow-text {
                background: linear-gradient(90deg, #ff2a2a, #ff7a00, #ffc500, #43ea43, #0b96ff, #5e00ff, #d600ff);
                background-size: 200% 200%;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: gifManagerRainbow 2s linear infinite;
                padding-bottom: 2px;
            }
        `;
        document.head.appendChild(style);
    }

    console.log("ADHDfy 7.72 loaded");

    let savedGifs = JSON.parse(Spicetify.LocalStorage.get("MyCustomGifs") || "[]").map(gif => ({
        ...gif,
        anchor: "[data-testid='now-playing-widget']",
        flipped: gif.flipped || false,
        opacity: gif.opacity !== undefined ? gif.opacity : 1,
        rotation: gif.rotation || 0,
        visible: gif.visible !== false,
        tint: gif.tint || false,
        tintColor: gif.tintColor || "#e91e63",
        rainbow: gif.rainbow || false,
        rainbowSpeed: gif.rainbowSpeed || 5,
        spin: gif.spin || false,
        spinSpeed: gif.spinSpeed || 5,
        autoFlip: gif.autoFlip || false,
        flipSpeed: gif.flipSpeed || 5,
        attachedToProgress: gif.attachedToProgress || false,
        followMouse: gif.followMouse || false,
        dvdBounce: gif.dvdBounce || false,
        dvdSpeed: gif.dvdSpeed || 5,
        rainFall: gif.rainFall || false,
        rainSpeed: gif.rainSpeed || 5,
        rainCount: gif.rainCount || 15,
        crop: gif.crop || { t: 0, r: 0, b: 0, l: 0 }
    }));

    let renderedElements = [];
    let isEditMode = false;
    let globalMouseX = window.innerWidth / 2;
    let globalMouseY = window.innerHeight / 2;

    document.addEventListener("mousemove", (e) => {
        globalMouseX = e.clientX;
        globalMouseY = e.clientY;
    });

    function getMediaType(url) {
        if (!url) return "GIF";
        if (url.startsWith("data:")) {
            const mime = url.substring(5, url.indexOf(";"));
            if (mime.includes("image/webp")) return "WEBP";
            if (mime.includes("image/jpeg") || mime.includes("image/jpg")) return "JPG";
            if (mime.includes("image/png")) return "PNG";
            if (mime.includes("image/gif")) return "GIF";
            return "IMG";
        } else {
            const lowerUrl = url.toLowerCase().split('?')[0];
            if (lowerUrl.endsWith(".webp")) return "WEBP";
            if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) return "JPG";
            if (lowerUrl.endsWith(".png")) return "PNG";
            if (lowerUrl.endsWith(".gif")) return "GIF";
            return "IMG";
        }
    }

    function createMediaElement(url) {
        const el = document.createElement("img");
        el.src = url;
        return el;
    }

    function showCustomNotification(message, isError = false) {
        let toastContainer = document.getElementById("gif-manager-toast-container");
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.id = "gif-manager-toast-container";
            toastContainer.style.position = "fixed";
            toastContainer.style.top = "30px";
            toastContainer.style.left = "50%";
            toastContainer.style.transform = "translateX(-50%)";
            toastContainer.style.zIndex = "2147483647";
            toastContainer.style.display = "flex";
            toastContainer.style.flexDirection = "column";
            toastContainer.style.gap = "10px";
            toastContainer.style.pointerEvents = "none";

            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement("div");
        toast.style.background = isError ? "#e22134" : "var(--spice-button)";
        toast.style.color = isError ? "#fff" : "#000";
        toast.style.padding = "10px 20px";
        toast.style.borderRadius = "8px";
        toast.style.fontWeight = "bold";
        toast.style.fontSize = "13px";
        toast.style.boxShadow = "0 4px 15px rgba(0,0,0,0.8)";
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-20px)";
        toast.style.transition = "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        toast.innerText = message;

        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.opacity = "1";
                toast.style.transform = "translateY(0)";
            });
        });

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-20px)";
            setTimeout(() => {
                toast.remove();
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }, 300);
        }, 3000);
    }

    function getTransformString(flipped, rotation) {
        return (flipped ? 'scaleX(-1) ' : 'scaleX(1) ') + `rotate(${rotation}deg)`;
    }

    function renderGifs() {
        const oldStates = renderedElements.map(item => ({
            oldW: item.img.offsetWidth,
            oldH: item.img.offsetHeight,
            currentX: item.currentX,
            currentY: item.currentY,
            dvdVx: item.dvdVx,
            dvdVy: item.dvdVy,
            rainX: item.rainX,
            rainY: item.rainY,
            rainScale: item.rainScale,
            rainRot: item.rainRot,
            rainSpeedMult: item.rainSpeedMult,
            rainRotSpeed: item.rainRotSpeed,
            stepPhase: item.stepPhase,
            stepAmp: item.stepAmp,
            bobY: item.bobY,
            wobbleRot: item.wobbleRot,
            currentSpin: item.currentSpin,
            currentHueOffset: item.currentHueOffset,
            flipPhase: item.flipPhase,
            currentScaleX: item.currentScaleX
        }));

        renderedElements.forEach(item => item.img.remove());
        renderedElements = [];

        savedGifs.forEach((gifData) => {
            const wrapper = document.createElement("div");
            wrapper.style.position = "fixed";
            wrapper.style.zIndex = "9999";
            wrapper.style.opacity = gifData.opacity;
            wrapper.ondragstart = () => false;
            wrapper.dataset.dragging = "false";
            wrapper.style.transform = getTransformString(gifData.flipped, gifData.rotation);
            wrapper.style.lineHeight = "0";

            const img = createMediaElement(gifData.url);
            img.style.width = `${gifData.size}px`;
            img.style.display = "block";
            img.style.pointerEvents = "none";

            img.onerror = () => {
                showCustomNotification("Failed to load Media", true);
                if (img.tagName === "IMG") {
                    img.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e91e63'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z'/%3E%3C/svg%3E";
                }
            };

            if (gifData.crop && (gifData.crop.t > 0 || gifData.crop.r > 0 || gifData.crop.b > 0 || gifData.crop.l > 0)) {
                img.style.clipPath = `inset(${gifData.crop.t}% ${gifData.crop.r}% ${gifData.crop.b}% ${gifData.crop.l}%)`;
            }
            wrapper.appendChild(img);

            const borderBox = document.createElement("div");
            borderBox.style.position = "absolute";
            borderBox.style.pointerEvents = "none";
            borderBox.style.transition = 'outline 0.2s ease, box-shadow 0.2s ease';
            borderBox.style.boxSizing = "border-box";
            if (gifData.crop) {
                borderBox.style.top = `${gifData.crop.t}%`;
                borderBox.style.left = `${gifData.crop.l}%`;
                borderBox.style.width = `${100 - gifData.crop.l - gifData.crop.r}%`;
                borderBox.style.height = `${100 - gifData.crop.t - gifData.crop.b}%`;
            } else {
                borderBox.style.top = "0"; borderBox.style.left = "0"; borderBox.style.width = "100%"; borderBox.style.height = "100%";
            }
            wrapper.appendChild(borderBox);

            if (isEditMode) {
                wrapper.style.pointerEvents = "auto";
                wrapper.style.cursor = "grab";
                borderBox.style.outline = "2px dashed var(--spice-button)";
                borderBox.style.background = "rgba(255, 255, 255, 0.1)";

                wrapper.onmousedown = function (event) {
                    event.preventDefault();
                    wrapper.dataset.dragging = "true";
                    wrapper.style.cursor = "grabbing";
                    borderBox.style.transition = 'none';

                    const activeModal = document.querySelector("generic-modal");
                    if (activeModal) {
                        activeModal.style.transition = "opacity 0.2s ease";
                        activeModal.style.opacity = "0.2";
                        activeModal.style.pointerEvents = "none";
                    }

                    let shiftX = event.clientX - wrapper.getBoundingClientRect().left;
                    let shiftY = event.clientY - wrapper.getBoundingClientRect().top;

                    function moveAt(clientX, clientY) {
                        wrapper.style.left = clientX - shiftX + 'px';
                        wrapper.style.top = clientY - shiftY + 'px';
                        wrapper.style.bottom = 'auto';
                    }

                    function onMouseMove(event) { moveAt(event.clientX, event.clientY); }
                    document.addEventListener('mousemove', onMouseMove);

                    document.onmouseup = function () {
                        document.removeEventListener('mousemove', onMouseMove);
                        wrapper.style.cursor = "grab";
                        wrapper.dataset.dragging = "false";
                        borderBox.style.transition = 'outline 0.2s ease, box-shadow 0.2s ease';

                        if (activeModal) {
                            activeModal.style.opacity = "1";
                            activeModal.style.pointerEvents = "auto";
                        }

                        document.onmouseup = null;

                        const anchorEl = document.querySelector(gifData.anchor) || document.body;
                        const rect = anchorEl.getBoundingClientRect();

                        const physicalLeft = parseFloat(wrapper.style.left);
                        const physicalTop = parseFloat(wrapper.style.top);

                        const imgCenterX = physicalLeft + (wrapper.offsetWidth / 2);
                        const imgCenterY = physicalTop + (wrapper.offsetHeight / 2);

                        gifData.xPct = (imgCenterX - rect.left) / (rect.width || 1);
                        gifData.yPct = (imgCenterY - rect.top) / (rect.height || 1);

                        Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                    };
                };

                if (gifData.attachedToProgress || gifData.followMouse || gifData.dvdBounce || gifData.rainFall) {
                    wrapper.style.pointerEvents = "none";
                    borderBox.style.outline = gifData.followMouse ? "2px solid #0b96ff" : (gifData.dvdBounce ? "2px solid #ffc500" : (gifData.rainFall ? "2px solid #a855f7" : "2px solid #1ed760"));
                    wrapper.onmousedown = null;
                }
            } else {
                wrapper.style.pointerEvents = "none";
                borderBox.style.outline = "none";
                borderBox.style.background = "transparent";
                wrapper.onmousedown = null;
            }

            document.body.appendChild(wrapper);
            const stateObj = oldStates[renderedElements.length] || {};
            renderedElements.push({ img: wrapper, realImg: img, borderBox: borderBox, data: gifData, ...stateObj });

            if (gifData.rainFall) {
                const clonesCount = Math.max(0, (gifData.rainCount || 15) - 1);
                for (let i = 0; i < clonesCount; i++) {
                    const cloneWrapper = document.createElement("div");
                    cloneWrapper.style.position = "fixed";
                    cloneWrapper.style.zIndex = "9998";
                    cloneWrapper.style.pointerEvents = "none";
                    cloneWrapper.style.opacity = gifData.opacity;
                    cloneWrapper.style.transform = getTransformString(gifData.flipped, gifData.rotation);
                    cloneWrapper.style.lineHeight = "0";

                    const cloneImg = createMediaElement(gifData.url);
                    cloneImg.style.width = `${gifData.size}px`;
                    cloneImg.style.display = "block";
                    cloneImg.style.pointerEvents = "none";
                    if (gifData.crop && (gifData.crop.t > 0 || gifData.crop.r > 0 || gifData.crop.b > 0 || gifData.crop.l > 0)) {
                        cloneImg.style.clipPath = `inset(${gifData.crop.t}% ${gifData.crop.r}% ${gifData.crop.b}% ${gifData.crop.l}%)`;
                    }
                    cloneWrapper.appendChild(cloneImg);

                    const cloneBorderBox = document.createElement("div");
                    cloneBorderBox.style.position = "absolute";
                    cloneBorderBox.style.pointerEvents = "none";
                    cloneBorderBox.style.boxSizing = "border-box";
                    if (gifData.crop) {
                        cloneBorderBox.style.top = `${gifData.crop.t}%`;
                        cloneBorderBox.style.left = `${gifData.crop.l}%`;
                        cloneBorderBox.style.width = `${100 - gifData.crop.l - gifData.crop.r}%`;
                        cloneBorderBox.style.height = `${100 - gifData.crop.t - gifData.crop.b}%`;
                    } else {
                        cloneBorderBox.style.top = "0"; cloneBorderBox.style.left = "0"; cloneBorderBox.style.width = "100%"; cloneBorderBox.style.height = "100%";
                    }
                    cloneWrapper.appendChild(cloneBorderBox);

                    document.body.appendChild(cloneWrapper);
                    const cloneStateObj = oldStates[renderedElements.length] || {};
                    renderedElements.push({ img: cloneWrapper, realImg: cloneImg, borderBox: cloneBorderBox, data: gifData, isRainClone: true, ...cloneStateObj });
                }
            }
        });

        trackAnchors(performance.now(), true);
    }

    let lastTime = performance.now();
    function trackAnchors(timestamp, isSyncUpdate = false) {
        if (!timestamp) timestamp = performance.now();
        let dt = (timestamp - lastTime) / (1000 / 60);
        if (dt > 3) dt = 3;
        if (dt < 0) dt = 0;
        lastTime = timestamp;

        renderedElements.forEach(item => {
            try {
                if (item.data.visible === false) {
                    item.img.style.display = "none";
                    return;
                }

            if (item.img.dataset.dragging === "true") return;

            const w = item.img.offsetWidth || item.oldW || item.data.size;
            const h = item.img.offsetHeight || item.oldH || item.data.size;

            item.bobY = 0;
            item.wobbleRot = 0;

            if (item.data.followMouse) {
                item.currentX = item.currentX !== undefined ? item.currentX : globalMouseX;
                item.currentY = item.currentY !== undefined ? item.currentY : globalMouseY;

                const dx = globalMouseX - item.currentX;
                const dy = globalMouseY - item.currentY;
                const dist = Math.hypot(dx, dy);

                item.currentX += dx * (1 - Math.pow(0.982, dt));
                item.currentY += dy * (1 - Math.pow(0.982, dt));

                if (dist > 3) {
                    let curSpeed = Math.min(0.28, (dist / 40) * 0.28);
                    if (curSpeed < 0.09) curSpeed = 0.09;
                    item.stepPhase = (item.stepPhase || 0) + (curSpeed * dt);

                    item.stepAmp = (item.stepAmp || 0) + 0.15 * dt;
                    if (item.stepAmp > 1) item.stepAmp = 1;
                } else {
                    if (item.stepAmp) {
                        item.stepAmp *= Math.pow(0.60, dt);
                        if (item.stepAmp < 0.01) item.stepAmp = 0;
                        item.stepPhase += 0.05 * dt;
                    }
                }

                const amp = item.stepAmp || 0;
                item.bobY = amp ? -Math.abs(Math.sin(item.stepPhase)) * 8 * amp : 0;
                item.wobbleRot = amp ? Math.sin(item.stepPhase) * 12 * amp : 0;

                item.img.style.left = `${item.currentX - (w / 2)}px`;
                item.img.style.top = `${item.currentY - (h / 2)}px`;
                item.img.style.bottom = 'auto';
                item.img.style.display = "block";
            } else if (item.data.dvdBounce) {
                item.currentX = item.currentX !== undefined ? item.currentX : window.innerWidth / 2;
                item.currentY = item.currentY !== undefined ? item.currentY : window.innerHeight / 2;

                const speed = (item.data.dvdSpeed || 5) * 0.5;
                if (item.dvdVx === undefined) {
                    item.dvdVx = (Math.random() > 0.5 ? speed : -speed);
                    item.dvdVy = (Math.random() > 0.5 ? speed : -speed);
                } else {
                    item.dvdVx = Math.sign(item.dvdVx || 1) * speed;
                    item.dvdVy = Math.sign(item.dvdVy || 1) * speed;
                }

                item.currentX += item.dvdVx * dt;
                item.currentY += item.dvdVy * dt;

                const leftBound = w / 2;
                const rightBound = window.innerWidth - w / 2;
                const topBound = h / 2;
                const bottomBound = window.innerHeight - h / 2;

                if (item.currentX <= leftBound) { item.currentX = leftBound; item.dvdVx = Math.abs(item.dvdVx); }
                if (item.currentX >= rightBound) { item.currentX = rightBound; item.dvdVx = -Math.abs(item.dvdVx); }
                if (item.currentY <= topBound) { item.currentY = topBound; item.dvdVy = Math.abs(item.dvdVy); }
                if (item.currentY >= bottomBound) { item.currentY = bottomBound; item.dvdVy = -Math.abs(item.dvdVy); }

                item.img.style.left = `${item.currentX - w / 2}px`;
                item.img.style.top = `${item.currentY - h / 2}px`;
                item.img.style.bottom = 'auto';
                item.img.style.display = "block";
            } else if (item.data.rainFall) {
                if (item.rainY === undefined) {
                    item.rainX = Math.random() * window.innerWidth;
                    item.rainY = -(Math.random() * window.innerHeight * 1.5);
                    item.rainSpeedMult = 0.5 + Math.random();
                    item.rainRotSpeed = (Math.random() - 0.5) * 5;
                    item.rainRot = Math.random() * 360;
                    item.rainScale = 0.4 + Math.random() * 0.8;
                }

                const speed = (item.data.rainSpeed || 5) * 1.5 * item.rainSpeedMult;
                item.rainY += speed * dt;
                item.rainRot += item.rainRotSpeed * dt;

                const hScaled = h * item.rainScale;
                if (item.rainY > window.innerHeight + hScaled) {
                    item.rainY = -hScaled - (Math.random() * 200);
                    item.rainX = Math.random() * window.innerWidth;
                    item.rainSpeedMult = 0.5 + Math.random();
                    item.rainScale = 0.4 + Math.random() * 0.8;
                }

                item.img.style.left = `${item.currentX = item.rainX - (w / 2)}px`;
                item.img.style.top = `${item.currentY = item.rainY - (h / 2)}px`;
                item.img.style.bottom = 'auto';
                item.img.style.display = "block";

                item.currentScaleX = (item.data.flipped ? -1 : 1) * item.rainScale;
                item.currentSpin = item.rainRot;
            } else if (item.data.attachedToProgress) {
                const progBar = document.querySelector('[data-testid="playback-progressbar"]') || document.querySelector('.playback-bar');
                if (progBar && Spicetify.Player && typeof Spicetify.Player.getDuration === "function" && Spicetify.Player.getDuration() > 0) {
                    const progRect = progBar.getBoundingClientRect();
                    const duration = Spicetify.Player.getDuration();
                    const progress = Spicetify.Player.getProgress();

                    let pct = progress / duration;
                    if (pct < 0) pct = 0;
                    if (pct > 1) pct = 1;

                    const centerTargetX = progRect.left + (progRect.width * pct);
                    const centerTargetY = progRect.top + (progRect.height / 2);

                    item.img.style.left = `${centerTargetX - (w / 2)}px`;
                    item.img.style.top = `${centerTargetY - (h / 2)}px`;
                    item.img.style.bottom = 'auto';
                    item.img.style.display = "block";
                } else {
                    item.img.style.display = "none";
                }
            } else {
                const anchorEl = document.querySelector(item.data.anchor) || document.body;
                const rect = anchorEl.getBoundingClientRect();

                if (rect.width === 0) {
                    item.img.style.display = "none";
                } else {
                    item.img.style.display = "block";
                    if (item.data.xPct !== undefined) {
                        const centerTargetX = rect.left + (rect.width * item.data.xPct);
                        const centerTargetY = rect.top + (rect.height * item.data.yPct);

                        item.img.style.left = `${centerTargetX - (w / 2)}px`;
                        item.img.style.top = `${centerTargetY - (h / 2)}px`;
                        item.img.style.bottom = 'auto';
                    } else {
                        const screenLeft = rect.left + item.data.x;
                        const screenBottom = (window.innerHeight - rect.bottom) + item.data.y;
                        item.img.style.left = `${screenLeft}px`;
                        item.img.style.bottom = `${screenBottom}px`;
                        item.img.style.top = 'auto';
                    }
                }
            }

            let filterStr = "";
            let baseHueAngle = 0;

            if (item.data.tint) {
                const hex = item.data.tintColor || "#e91e63";
                const r = parseInt(hex.substr(1, 2), 16) / 255;
                const g = parseInt(hex.substr(3, 2), 16) / 255;
                const b = parseInt(hex.substr(5, 2), 16) / 255;
                const cmax = Math.max(r, g, b), cmin = Math.min(r, g, b), delta = cmax - cmin;
                let h = 0;
                if (delta !== 0) {
                    if (cmax === r) h = ((g - b) / delta) % 6;
                    else if (cmax === g) h = (b - r) / delta + 2;
                    else h = (r - g) / delta + 4;
                }
                h = Math.round(h * 60);
                if (h < 0) h += 360;
                baseHueAngle = h;
                filterStr += `grayscale(1) sepia(1) saturate(5) hue-rotate(${h - 40}deg) `;
            }

            if (item.data.rainbow) {
                item.currentHueOffset = (item.currentHueOffset || 0) + ((item.data.rainbowSpeed || 5) * 0.2 * dt);
                filterStr += `hue-rotate(${item.currentHueOffset}deg) `;
            } else {
                item.currentHueOffset = 0;
            }

            if (item.realImg) {
                item.realImg.style.filter = filterStr;
            } else {
                item.img.style.filter = filterStr;
            }

            if (item.data.spin) {
                item.currentSpin = (item.currentSpin || 0) + ((item.data.spinSpeed || 5) * 0.3 * dt);
            } else {
                item.currentSpin = 0;
            }

            if (item.data.autoFlip) {
                item.flipPhase = (item.flipPhase || 0) + ((item.data.flipSpeed || 5) * 0.005 * dt);
                item.currentScaleX = Math.cos(item.flipPhase);
                if (item.data.flipped) item.currentScaleX *= -1;
            } else {
                if (item.currentScaleX === undefined) item.currentScaleX = item.data.flipped ? -1 : 1;
                const targetScaleX = item.data.flipped ? -1 : 1;
                item.currentScaleX += (targetScaleX - item.currentScaleX) * (1 - Math.pow(0.85, dt));
            }

            const rot = (item.data.rotation || 0) + (item.currentSpin || 0) + (item.wobbleRot || 0);
            const bobbing = item.bobY ? `translateY(${item.bobY}px) ` : "";
            item.img.style.transform = `${bobbing}scaleX(${item.currentScaleX}) rotate(${rot}deg)`;
            } catch (err) {
                console.error("ADHDfy: trackAnchors render loop error for element", err);
            }
        });

        if (!isSyncUpdate) {
            requestAnimationFrame(trackAnchors);
        }
    }
    trackAnchors();

    function createStyledButton(text, bgColor, textColor) {
        const btn = document.createElement("button");
        btn.innerText = text;
        btn.style.padding = "6px 10px";
        btn.style.borderRadius = "4px";
        btn.style.background = bgColor;
        btn.style.color = textColor;
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "12px";
        return btn;
    }

    const modalContent = document.createElement("div");
    modalContent.style.display = "flex";
    modalContent.style.flexDirection = "column";
    modalContent.style.gap = "15px";
    modalContent.style.color = "var(--spice-text)";

    const presetForm = document.createElement("div");
    presetForm.style.display = "flex";
    presetForm.style.gap = "10px";
    presetForm.style.justifyContent = "space-between";
    presetForm.style.alignItems = "center";
    presetForm.style.paddingBottom = "10px";
    presetForm.style.borderBottom = "1px solid var(--spice-button-disabled)";

    const presetTitle = document.createElement("p");
    presetTitle.innerText = "Layouts:";
    presetTitle.style.margin = "0";
    presetTitle.style.fontWeight = "bold";

    const presetButtons = document.createElement("div");
    presetButtons.style.display = "flex";
    presetButtons.style.gap = "10px";

    const exportBtn = createStyledButton("Save", "var(--spice-button)", "#000");
    exportBtn.onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedGifs, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "adhdfy_layout.json");
        document.body.appendChild(dlAnchorElem);
        dlAnchorElem.click();
        dlAnchorElem.remove();
        showCustomNotification("Layout Exported!");
    };

    const importBtn = createStyledButton("Load", "var(--spice-button)", "#000");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.style.display = "none";

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (Array.isArray(parsed)) {
                    savedGifs = parsed;
                    Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                    renderGifs();
                    updateListUI();
                    showCustomNotification("Layout Imported!");
                } else {
                    showCustomNotification("Invalid layout format.", true);
                }
            } catch (err) {
                showCustomNotification("Failed to read file.", true);
            }
        };
        reader.readAsText(file);
        fileInput.value = "";
    };

    importBtn.onclick = () => fileInput.click();

    presetButtons.appendChild(exportBtn);
    presetButtons.appendChild(importBtn);
    presetButtons.appendChild(fileInput);

    presetForm.appendChild(presetTitle);
    presetForm.appendChild(presetButtons);

    const addForm = document.createElement("div");
    addForm.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <p style="margin: 0; font-weight: bold;">Add new Image (URL, Local File, or Search):</p>
            <div style="display: flex; gap: 10px;">
                <input id="gif-url" type="text" placeholder="Paste direct link (URL)..." style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--spice-button-disabled); background: var(--spice-main); color: var(--spice-text);">
                <button id="search-gif-btn" style="padding: 8px 15px; border-radius: 4px; border: 1px solid var(--spice-button-disabled); background: var(--spice-card); color: var(--spice-text); font-weight: bold; cursor: pointer; transition: all 0.2s ease;">Search GIFs</button>
                <button id="browse-file-btn" style="padding: 8px 15px; border-radius: 4px; border: 1px solid var(--spice-button-disabled); background: var(--spice-card); color: var(--spice-text); font-weight: bold; cursor: pointer; transition: all 0.2s ease;">Browse File</button>
            </div>
            <div id="tenor-search-container" style="display: none; flex-direction: column; gap: 10px; background: var(--spice-card); padding: 10px; border-radius: 8px; border: 1px solid var(--spice-button-disabled);">
                <div style="display: flex; gap: 5px;">
                    <input id="tenor-search-input" type="text" placeholder="Type to search GIFs and press Enter..." style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--spice-button-disabled); background: var(--spice-main); color: var(--spice-text); box-sizing: border-box;">
                    <button id="tenor-execute-btn" style="padding: 8px 15px; border-radius: 4px; border: 1px solid var(--spice-button-disabled); background: var(--spice-button); color: #000; font-weight: bold; cursor: pointer; transition: all 0.2s ease;">Search</button>
                </div>
                <div id="tenor-results-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; max-height: 250px; overflow-y: auto;"></div>
                <div id="tenor-load-more" style="display: none; padding: 8px; text-align: center; background: var(--spice-button); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 5px; transition: all 0.2s ease;">Load More</div>
                <div id="tenor-loading" style="display: none; text-align: center; color: var(--spice-subtext); font-size: 12px; padding: 5px;">Searching...</div>
            </div>
            <input id="file-input-hidden" type="file" accept="image/*" style="display: none;">
            <div style="display: flex; gap: 10px;">
                <input id="gif-size" type="number" placeholder="Size (px, default: 50)" style="padding: 8px; border-radius: 4px; width: 100%; border: 1px solid var(--spice-button-disabled); background: var(--spice-main); color: var(--spice-text);">
            </div>
            <button id="add-gif-btn" style="padding: 10px; border-radius: 8px; background: var(--spice-button); color: #000; font-weight: bold; cursor: pointer; border: none;">Add</button>
        </div>
    `;

    const manageHeaderContainer = document.createElement("div");
    manageHeaderContainer.style.display = "flex";
    manageHeaderContainer.style.flexDirection = "column";
    manageHeaderContainer.style.gap = "10px";
    manageHeaderContainer.style.marginTop = "5px";

    const hr = document.createElement("hr");
    hr.style.borderColor = "var(--spice-button-disabled)";
    hr.style.width = "100%";
    hr.style.margin = "0";

    const manageHeader = document.createElement("div");
    manageHeader.style.display = "flex";
    manageHeader.style.justifyContent = "space-between";
    manageHeader.style.alignItems = "center";

    const manageTitle = document.createElement("p");
    manageTitle.innerText = "Manage GIFs:";
    manageTitle.style.margin = "0";
    manageTitle.style.fontWeight = "bold";

    const toggleAllBtn = createStyledButton("Hide All", "var(--spice-button)", "#000");
    toggleAllBtn.onclick = () => {
        const anyVisible = savedGifs.some(g => g.visible);
        savedGifs.forEach(g => g.visible = !anyVisible);
        Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
        renderGifs();
        updateListUI();
    };

    const deleteAllBtn = createStyledButton("Delete All", "#e91e63", "white");
    deleteAllBtn.onclick = () => {
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.background = "rgba(0, 0, 0, 0.7)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "99999";
        overlay.style.backdropFilter = "blur(10px)";

        const dialog = document.createElement("div");
        dialog.style.background = "var(--spice-main)";
        dialog.style.padding = "30px";
        dialog.style.borderRadius = "8px";
        dialog.style.display = "flex";
        dialog.style.flexDirection = "column";
        dialog.style.gap = "15px";
        dialog.style.textAlign = "center";
        dialog.style.minWidth = "300px";
        dialog.style.boxShadow = "0 8px 30px rgba(0,0,0,0.6)";

        const title = document.createElement("h2");
        title.innerText = "Delete All GIFs?";
        title.style.margin = "0";
        title.style.color = "var(--spice-text)";
        title.style.fontSize = "22px";
        title.style.fontWeight = "bold";

        const desc = document.createElement("p");
        desc.innerText = "Are you sure you want to delete all GIFs?\nThis action cannot be undone.";
        desc.style.margin = "0";
        desc.style.color = "var(--spice-subtext)";
        desc.style.fontSize = "14px";
        desc.style.lineHeight = "1.5";

        const btnContainer = document.createElement("div");
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "15px";
        btnContainer.style.justifyContent = "flex-end";
        btnContainer.style.marginTop = "20px";

        const cancelBtn = createStyledButton("Cancel", "transparent", "var(--spice-text)");
        cancelBtn.style.padding = "12px 24px";
        cancelBtn.style.fontSize = "14px";
        cancelBtn.style.fontWeight = "bold";
        cancelBtn.onmouseover = () => { cancelBtn.style.transform = "scale(1.05)"; };
        cancelBtn.onmouseout = () => { cancelBtn.style.transform = "scale(1)"; };
        cancelBtn.style.transition = "transform 0.1s ease";
        cancelBtn.onclick = () => overlay.remove();

        const confirmBtn = createStyledButton("Delete", "#e91e63", "white");
        confirmBtn.style.padding = "12px 24px";
        confirmBtn.style.fontSize = "14px";
        confirmBtn.style.fontWeight = "bold";
        confirmBtn.onmouseover = () => { confirmBtn.style.transform = "scale(1.05)"; };
        confirmBtn.onmouseout = () => { confirmBtn.style.transform = "scale(1)"; };
        confirmBtn.style.transition = "transform 0.1s ease";
        confirmBtn.onclick = () => {
            savedGifs = [];
            Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
            renderGifs();
            updateListUI();
            overlay.remove();
        };

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(confirmBtn);

        dialog.appendChild(title);
        dialog.appendChild(desc);
        dialog.appendChild(btnContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    };

    const headerButtons = document.createElement("div");
    headerButtons.style.display = "flex";
    headerButtons.style.gap = "10px";
    headerButtons.appendChild(toggleAllBtn);
    headerButtons.appendChild(deleteAllBtn);

    manageHeader.appendChild(manageTitle);
    manageHeader.appendChild(headerButtons);
    manageHeaderContainer.appendChild(hr);
    manageHeaderContainer.appendChild(manageHeader);

    const listContainer = document.createElement("div");
    listContainer.id = "gif-list-container";
    listContainer.style.display = "flex";
    listContainer.style.flexDirection = "column";
    listContainer.style.gap = "10px";

    modalContent.appendChild(presetForm);
    modalContent.appendChild(addForm);
    modalContent.appendChild(manageHeaderContainer);
    modalContent.appendChild(listContainer);

    const mainModalContainer = document.createElement("div");
    mainModalContainer.appendChild(modalContent);

    const infoContent = document.createElement("div");
    infoContent.style.color = "var(--spice-text)";
    infoContent.style.display = "none";
    infoContent.style.flexDirection = "column";
    infoContent.style.gap = "10px";
    infoContent.style.fontSize = "14px";

    infoContent.innerHTML = `
        <p style="margin: 0;">Add your gifs or images by pasting a link, uploading a local file, or searching gifs with Tenor.</p>
        <p style="margin: 0;"><strong>Important:</strong> Local uploads have a strict 2.5MB limit due to Spotify constraints. For unlimited file sizes, it's best to add your media using direct links or the search tool instead.</p>
        <p style="margin: 0;">Once added, you can move the images anywhere on the screen by dragging them around while this menu is open.</p>
        <p style="margin: 0;">Tweak the look with sliders to adjust the size, opacity, and rotation of your media.</p>
        <p style="margin: 0;">Use the buttons to easily hide, crop, flip, duplicate, or delete your items.</p>
        <p style="margin: 0;">Turn on motion effects like Rainbow, Auto-Spin, DVD Bounce, Prog Bar tracking, or Rain Fall.</p>
        <p style="margin: 0;">Save your custom layout as a file to share or import it back later.</p>
        <p style="margin-top: 20px; margin-bottom: 0;">handcrafted with love by <a href="https://github.com/ABTOPEMOHT" target="_blank" style="color: var(--spice-button); text-decoration: none; font-weight: bold;">AВТОРЕМОНТ</a></p>
    `;

    mainModalContainer.appendChild(infoContent);

    function openCropperOverlay(gif, onSave) {
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.background = "rgba(0, 0, 0, 0.85)";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "99999";
        overlay.style.backdropFilter = "blur(10px)";
        overlay.style.gap = "20px";

        const title = document.createElement("h2");
        title.innerText = "Drag edges and corners to crop";
        title.style.margin = "0";
        title.style.color = "var(--spice-text)";
        title.style.textShadow = "0 2px 4px rgba(0,0,0,0.5)";

        const previewContainer = document.createElement("div");
        previewContainer.style.background = "repeating-conic-gradient(#333 0% 25%, #111 0% 50%) 50% / 20px 20px";
        previewContainer.style.borderRadius = "8px";
        previewContainer.style.padding = "20px";
        previewContainer.style.boxShadow = "0 8px 30px rgba(0,0,0,0.6)";

        const imgWrapper = document.createElement("div");
        imgWrapper.style.position = "relative";
        imgWrapper.style.display = "inline-block";
        imgWrapper.style.lineHeight = "0";
        imgWrapper.style.userSelect = "none";

        const previewImg = createMediaElement(gif.url);
        previewImg.style.maxHeight = "60vh";
        previewImg.style.maxWidth = "70vw";
        previewImg.style.display = "block";
        previewImg.ondragstart = () => false;

        let tempCrop = { ...(gif.crop || { t: 0, r: 0, b: 0, l: 0 }) };

        const maskBox = document.createElement("div");
        maskBox.style.position = "absolute";
        maskBox.style.top = "0"; maskBox.style.left = "0"; maskBox.style.right = "0"; maskBox.style.bottom = "0";
        maskBox.style.overflow = "hidden";
        maskBox.style.pointerEvents = "none";

        const shadowHole = document.createElement("div");
        shadowHole.style.position = "absolute";
        shadowHole.style.boxShadow = "0 0 0 9999px rgba(0,0,0,0.6)";
        maskBox.appendChild(shadowHole);

        const cropBox = document.createElement("div");
        cropBox.style.position = "absolute";
        cropBox.style.border = "2px dashed var(--spice-button)";
        cropBox.style.boxSizing = "border-box";

        function createHandle(cursor, top, right, bottom, left) {
            const h = document.createElement("div");
            h.style.position = "absolute";
            h.style.width = "14px";
            h.style.height = "14px";
            h.style.background = "#fff";
            h.style.border = "2px solid var(--spice-button)";
            h.style.borderRadius = "50%";
            h.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";
            h.style.cursor = cursor;
            h.style.zIndex = "10";
            if (top !== null) h.style.top = top;
            if (right !== null) h.style.right = right;
            if (bottom !== null) h.style.bottom = bottom;
            if (left !== null) h.style.left = left;
            return h;
        }

        const tl = createHandle("nwse-resize", "-7px", null, null, "-7px");
        const tr = createHandle("nesw-resize", "-7px", "-7px", null, null);
        const bl = createHandle("nesw-resize", null, null, "-7px", "-7px");
        const br = createHandle("nwse-resize", null, "-7px", "-7px", null);

        const topEdge = createHandle("ns-resize", "-7px", "calc(50% - 7px)", null, null);
        const bottomEdge = createHandle("ns-resize", null, "calc(50% - 7px)", "-7px", null);
        const leftEdge = createHandle("ew-resize", "calc(50% - 7px)", null, null, "-7px");
        const rightEdge = createHandle("ew-resize", "calc(50% - 7px)", "-7px", null, null);

        cropBox.appendChild(tl);
        cropBox.appendChild(tr);
        cropBox.appendChild(bl);
        cropBox.appendChild(br);
        cropBox.appendChild(topEdge);
        cropBox.appendChild(bottomEdge);
        cropBox.appendChild(leftEdge);
        cropBox.appendChild(rightEdge);

        const labelText = document.createElement("div");
        labelText.style.position = "absolute";
        labelText.style.top = "50%";
        labelText.style.left = "50%";
        labelText.style.transform = "translate(-50%, -50%)";
        labelText.style.color = "white";
        labelText.style.fontSize = "16px";
        labelText.style.fontWeight = "bold";
        labelText.style.textShadow = "0 2px 4px black";
        labelText.style.pointerEvents = "none";
        labelText.style.whiteSpace = "nowrap";
        cropBox.appendChild(labelText);

        cropBox.style.cursor = "grab";

        function updatePreview() {
            cropBox.style.top = `${tempCrop.t}%`;
            cropBox.style.bottom = `${tempCrop.b}%`;
            cropBox.style.left = `${tempCrop.l}%`;
            cropBox.style.right = `${tempCrop.r}%`;

            shadowHole.style.top = `${tempCrop.t}%`;
            shadowHole.style.bottom = `${tempCrop.b}%`;
            shadowHole.style.left = `${tempCrop.l}%`;
            shadowHole.style.right = `${tempCrop.r}%`;

            const nw = previewImg.naturalWidth || previewImg.videoWidth || 0;
            const nh = previewImg.naturalHeight || previewImg.videoHeight || 0;
            const pxW = Math.round(nw * (100 - tempCrop.l - tempCrop.r) / 100);
            const pxH = Math.round(nh * (100 - tempCrop.t - tempCrop.b) / 100);
            labelText.innerText = `${pxW} x ${pxH} px`;

            if ((100 - tempCrop.l - tempCrop.r) < 15 || (100 - tempCrop.t - tempCrop.b) < 15) {
                labelText.style.display = "none";
            } else {
                labelText.style.display = "block";
            }
        }

        previewImg.onload = updatePreview;
        previewImg.onloadeddata = updatePreview;

        imgWrapper.appendChild(previewImg);
        imgWrapper.appendChild(maskBox);
        imgWrapper.appendChild(cropBox);
        previewContainer.appendChild(imgWrapper);

        let activeHandle = null;
        let startCrop = null;
        let startMouseX = 0;
        let startMouseY = 0;

        cropBox.onmousedown = (e) => {
            if (e.target !== cropBox && e.target !== labelText) return;
            e.preventDefault();
            activeHandle = "move";
            startCrop = { ...tempCrop };
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            cropBox.style.cursor = "grabbing";
        };

        function attachDrag(el, handleName) {
            el.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                activeHandle = handleName;
            };
        }

        attachDrag(tl, "tl");
        attachDrag(tr, "tr");
        attachDrag(bl, "bl");
        attachDrag(br, "br");
        attachDrag(topEdge, "t");
        attachDrag(bottomEdge, "b");
        attachDrag(leftEdge, "l");
        attachDrag(rightEdge, "r");

        const onMouseMove = (e) => {
            if (!activeHandle) return;
            const rect = imgWrapper.getBoundingClientRect();

            if (activeHandle === "move") {
                const dxPct = ((e.clientX - startMouseX) / rect.width) * 100;
                const dyPct = ((e.clientY - startMouseY) / rect.height) * 100;

                const cropW = 100 - startCrop.l - startCrop.r;
                const cropH = 100 - startCrop.t - startCrop.b;

                let newL = startCrop.l + dxPct;
                let newT = startCrop.t + dyPct;

                if (newL < 0) newL = 0;
                if (newT < 0) newT = 0;
                if (newL + cropW > 100) newL = 100 - cropW;
                if (newT + cropH > 100) newT = 100 - cropH;

                tempCrop.l = newL;
                tempCrop.r = 100 - newL - cropW;
                tempCrop.t = newT;
                tempCrop.b = 100 - newT - cropH;
            } else {
                let pctX = ((e.clientX - rect.left) / rect.width) * 100;
                let pctY = ((e.clientY - rect.top) / rect.height) * 100;

                pctX = Math.max(0, Math.min(100, pctX));
                pctY = Math.max(0, Math.min(100, pctY));

                if (activeHandle === "tl") {
                    tempCrop.l = Math.min(pctX, 100 - tempCrop.r - 2);
                    tempCrop.t = Math.min(pctY, 100 - tempCrop.b - 2);
                } else if (activeHandle === "tr") {
                    tempCrop.r = Math.min(100 - pctX, 100 - tempCrop.l - 2);
                    tempCrop.t = Math.min(pctY, 100 - tempCrop.b - 2);
                } else if (activeHandle === "bl") {
                    tempCrop.l = Math.min(pctX, 100 - tempCrop.r - 2);
                    tempCrop.b = Math.min(100 - pctY, 100 - tempCrop.t - 2);
                } else if (activeHandle === "br") {
                    tempCrop.r = Math.min(100 - pctX, 100 - tempCrop.l - 2);
                    tempCrop.b = Math.min(100 - pctY, 100 - tempCrop.t - 2);
                } else if (activeHandle === "t") {
                    tempCrop.t = Math.min(pctY, 100 - tempCrop.b - 2);
                } else if (activeHandle === "b") {
                    tempCrop.b = Math.min(100 - pctY, 100 - tempCrop.t - 2);
                } else if (activeHandle === "l") {
                    tempCrop.l = Math.min(pctX, 100 - tempCrop.r - 2);
                } else if (activeHandle === "r") {
                    tempCrop.r = Math.min(100 - pctX, 100 - tempCrop.l - 2);
                }
            }
            updatePreview();
        };

        const onMouseUp = () => {
            activeHandle = null;
            cropBox.style.cursor = "grab";
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        const btnContainer = document.createElement("div");
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "15px";

        const cancelBtn = createStyledButton("Cancel", "var(--spice-card)", "var(--spice-text)");
        cancelBtn.style.padding = "10px 20px";
        cancelBtn.style.fontSize = "14px";
        cancelBtn.onclick = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            overlay.remove();
        };

        const saveBtn = createStyledButton("Apply Crop", "var(--spice-button)", "#000");
        saveBtn.style.fontWeight = "bold";
        saveBtn.style.padding = "10px 20px";
        saveBtn.style.fontSize = "14px";
        saveBtn.onclick = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            gif.crop = { ...tempCrop };
            overlay.remove();
            onSave();
        };

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(saveBtn);

        overlay.appendChild(title);
        overlay.appendChild(previewContainer);
        overlay.appendChild(btnContainer);
        document.body.appendChild(overlay);

        updatePreview();
    }

    function updateListUI() {
        listContainer.innerHTML = "";

        if (savedGifs.length === 0) {
            listContainer.innerHTML = "<p style='color: gray; margin: 0; font-size: 14px;'>Empty for now. Add your first GIF above!</p>";
            toggleAllBtn.style.display = "none";
            deleteAllBtn.style.display = "none";
            return;
        }

        toggleAllBtn.style.display = "block";
        deleteAllBtn.style.display = "block";
        const anyVisible = savedGifs.some(g => g.visible);
        toggleAllBtn.innerText = anyVisible ? "Hide All" : "Show All";

        savedGifs.forEach((gif, index) => {
            const item = document.createElement("div");
            item.style.display = "flex";
            item.style.flexDirection = "column";
            item.style.gap = "10px";
            item.style.padding = "10px";
            item.style.background = "var(--spice-card)";
            item.style.borderRadius = "8px";

            item.style.transition = "outline 0.2s ease";
            item.style.outline = "2px solid transparent";
            item.style.outlineOffset = "-2px";

            item.onmouseenter = () => {
                item.style.outline = "2px solid white";
                renderedElements.filter(el => el.data === gif).forEach(element => {
                    if (element.borderBox) {
                        element.borderBox.dataset.prevOutline = element.borderBox.style.outline;
                        element.borderBox.style.outline = "4px solid white";
                        element.borderBox.style.boxShadow = "0 0 15px white";
                    }
                });
            };

            item.onmouseleave = () => {
                item.style.outline = "2px solid transparent";
                renderedElements.filter(el => el.data === gif).forEach(element => {
                    if (element.borderBox) {
                        element.borderBox.style.outline = element.borderBox.dataset.prevOutline || "none";
                        element.borderBox.style.boxShadow = "none";
                    }
                });
            };

            const topRow = document.createElement("div");
            topRow.style.display = "flex";
            topRow.style.alignItems = "center";
            topRow.style.justifyContent = "space-between";

            const previewImg = createMediaElement(gif.url);
            previewImg.style.width = "32px";
            previewImg.style.height = "32px";
            previewImg.style.objectFit = "cover";
            previewImg.style.borderRadius = "4px";
            previewImg.style.background = "#000";
            previewImg.style.transform = getTransformString(gif.flipped, gif.rotation);
            if (gif.crop && (gif.crop.t > 0 || gif.crop.r > 0 || gif.crop.b > 0 || gif.crop.l > 0)) {
                previewImg.style.clipPath = `inset(${gif.crop.t}% ${gif.crop.r}% ${gif.crop.b}% ${gif.crop.l}%)`;
            }

            const previewContainer = document.createElement("div");
            previewContainer.style.display = "flex";
            previewContainer.style.alignItems = "center";
            previewContainer.style.gap = "10px";
            previewContainer.appendChild(previewImg);

            const type = getMediaType(gif.url);
            const textInfo = document.createElement("div");
            textInfo.style.fontSize = "13px";
            textInfo.style.color = "var(--spice-text)";
            textInfo.innerText = `${type} #${index + 1}`;
            previewContainer.appendChild(textInfo);

            const buttonGroup = document.createElement("div");
            buttonGroup.style.display = "flex";
            buttonGroup.style.gap = "5px";
            buttonGroup.style.flexWrap = "wrap";

            const visBtn = createStyledButton(gif.visible ? "Hide" : "Show", "var(--spice-button)", "#000");
            visBtn.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                gif.visible = !gif.visible;
                Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                visBtn.innerText = gif.visible ? "Hide" : "Show";
                updateListUI();
            };

            const cropBtn = createStyledButton("Crop", "var(--spice-button)", "#000");
            cropBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof openCropperOverlay === "function") {
                    openCropperOverlay(gif, () => {
                        Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                        renderGifs();
                        updateListUI();
                    });
                }
            };

            const flipBtn = createStyledButton("Flip", "var(--spice-button)", "#000");
            flipBtn.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                gif.flipped = !gif.flipped;
                Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));

                renderedElements.filter(item => item.data === gif).forEach(element => {
                    element.img.style.transform = getTransformString(gif.flipped, gif.rotation);
                });
                previewImg.style.transform = getTransformString(gif.flipped, gif.rotation);
            };

            const duplicateBtn = createStyledButton("Duplicate", "var(--spice-button)", "#000");
            duplicateBtn.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();

                const clonedGif = { ...gif };
                clonedGif.xPct = Math.min(0.95, clonedGif.xPct + 0.05);
                clonedGif.yPct = Math.min(0.95, clonedGif.yPct + 0.05);

                savedGifs.splice(index + 1, 0, clonedGif);
                Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));

                renderGifs();
                setTimeout(() => { updateListUI(); }, 10);
            };

            const resetBtn = createStyledButton("Reset", "var(--spice-button)", "#000");
            resetBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const el = renderedElements.find(i => i.data === gif);
                if (el && el.img) {
                    el.currentSpin = 0;
                    el.currentHueOffset = 0;
                    el.flipPhase = 0;
                }

                gif.size = 50;
                gif.opacity = 1;
                gif.rotation = 0;
                gif.flipped = false;
                gif.tint = false;
                gif.tintColor = "#e91e63";
                gif.rainbow = false;
                gif.spin = false;
                gif.autoFlip = false;
                gif.attachedToProgress = false;
                gif.followMouse = false;
                gif.dvdBounce = false;
                gif.rainFall = false;
                gif.crop = { t: 0, r: 0, b: 0, l: 0 };
                Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));

                renderGifs();
                setTimeout(() => { updateListUI(); }, 10);
            };

            const deleteBtn = createStyledButton("Delete", "#e91e63", "white");
            deleteBtn.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();

                savedGifs.splice(index, 1);
                Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                renderGifs();

                setTimeout(() => { updateListUI(); }, 10);
            };

            const effectsBtn = createStyledButton("Effects", "linear-gradient(90deg, #ff2a2a, #ff7a00, #ffc500, #43ea43, #0b96ff, #5e00ff, #d600ff)", "white");
            effectsBtn.style.fontWeight = "bold";
            effectsBtn.style.textShadow = "0 1px 3px rgba(0,0,0,0.8)";

            buttonGroup.appendChild(effectsBtn);
            buttonGroup.appendChild(visBtn);
            buttonGroup.appendChild(cropBtn);
            buttonGroup.appendChild(flipBtn);
            buttonGroup.appendChild(duplicateBtn);
            buttonGroup.appendChild(resetBtn);
            buttonGroup.appendChild(deleteBtn);

            topRow.appendChild(previewContainer);
            topRow.appendChild(buttonGroup);

            const slidersContainer = document.createElement("div");
            slidersContainer.style.display = "flex";
            slidersContainer.style.flexDirection = "column";
            slidersContainer.style.gap = "6px";
            slidersContainer.style.fontSize = "12px";
            slidersContainer.style.marginTop = "5px";

            function createSlider(label, min, max, step, value, unit, onChange) {
                const wrapper = document.createElement("div");
                wrapper.style.display = "flex";
                wrapper.style.alignItems = "center";
                wrapper.style.justifyContent = "space-between";
                wrapper.style.gap = "5px";

                const labelContainer = document.createElement("div");
                labelContainer.style.display = "flex";
                labelContainer.style.alignItems = "center";
                labelContainer.style.gap = "5px";
                labelContainer.style.width = "55%";

                const labelText = document.createElement("span");
                labelText.innerText = `${label}:`;

                const numberInput = document.createElement("input");
                numberInput.type = "number";
                numberInput.min = min;
                numberInput.max = max;
                numberInput.step = step;
                numberInput.value = value;
                numberInput.style.width = "45px";
                numberInput.style.background = "var(--spice-main)";
                numberInput.style.color = "var(--spice-text)";
                numberInput.style.border = "1px solid var(--spice-button-disabled)";
                numberInput.style.borderRadius = "4px";
                numberInput.style.padding = "2px 4px";
                numberInput.style.fontSize = "12px";

                const unitText = document.createElement("span");
                unitText.innerText = unit;

                labelContainer.appendChild(labelText);
                labelContainer.appendChild(numberInput);
                labelContainer.appendChild(unitText);

                const rangeSlider = document.createElement("input");
                rangeSlider.type = "range";
                rangeSlider.min = min;
                rangeSlider.max = max;
                rangeSlider.step = step;
                rangeSlider.value = value;
                rangeSlider.className = "gif-manager-slider";
                rangeSlider.style.width = "40%";

                const updateValue = (newVal) => {
                    let parsed = parseFloat(newVal);
                    if (isNaN(parsed)) return;
                    if (parsed < min) parsed = min;
                    if (parsed > max) parsed = max;

                    rangeSlider.value = parsed;
                    numberInput.value = parsed;
                    onChange(parsed);
                };

                rangeSlider.oninput = (e) => updateValue(e.target.value);
                numberInput.onchange = (e) => updateValue(e.target.value);

                wrapper.appendChild(labelContainer);
                wrapper.appendChild(rangeSlider);
                return wrapper;
            }

            const sizeSlider = createSlider("Size", 10, 500, 1, gif.size, "px",
                (val) => {
                    gif.size = parseInt(val);
                    Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                    renderedElements.filter(item => item.data === gif).forEach(el => {
                        if (el.realImg) el.realImg.style.width = `${val}px`;
                        else el.img.style.width = `${val}px`;
                    });
                }
            );

            const currentOpacityPercent = Math.round(gif.opacity * 100);
            const opacitySlider = createSlider("Opacity", 10, 100, 1, currentOpacityPercent, "%",
                (val) => {
                    const decimalVal = parseFloat(val) / 100;
                    gif.opacity = decimalVal;
                    Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                    renderedElements.filter(item => item.data === gif).forEach(el => el.img.style.opacity = decimalVal);
                }
            );

            const rotationSlider = createSlider("Rotation", 0, 360, 1, gif.rotation, "°",
                (val) => {
                    gif.rotation = parseInt(val);
                    Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                    renderedElements.filter(item => item.data === gif).forEach(el => {
                        el.img.style.transform = getTransformString(gif.flipped, gif.rotation);
                    });
                    previewImg.style.transform = getTransformString(gif.flipped, gif.rotation);
                }
            );

            slidersContainer.appendChild(sizeSlider);
            slidersContainer.appendChild(opacitySlider);
            slidersContainer.appendChild(rotationSlider);

            const effectsContainer = document.createElement("div");
            effectsContainer.style.display = gif.uiEffectsOpen ? "flex" : "none";
            effectsContainer.style.flexDirection = "column";
            effectsContainer.style.gap = "6px";
            effectsContainer.style.padding = "6px 0 0 0";
            effectsContainer.style.marginTop = "0px";
            effectsContainer.style.fontSize = "12px";
            effectsBtn.onclick = (e) => {
                e.preventDefault();
                gif.uiEffectsOpen = !gif.uiEffectsOpen;
                effectsContainer.style.display = gif.uiEffectsOpen ? "flex" : "none";
            };

            function createEffectToggle(title, isColorPicker, activeField, speedField, qtyField = null) {
                const wrapper = document.createElement("div");
                wrapper.style.display = "flex";
                wrapper.style.alignItems = "center";
                wrapper.style.justifyContent = "space-between";
                wrapper.style.gap = "5px";

                const leftContainer = document.createElement("div");
                leftContainer.style.display = "flex";
                leftContainer.style.alignItems = "center";
                leftContainer.style.gap = "8px";
                leftContainer.style.width = "55%";

                const labelText = document.createElement("span");
                labelText.innerText = `${title}:`;

                let isActive = gif[activeField];
                const toggleBtn = createStyledButton(isActive ? "ON" : "OFF", isActive ? "var(--spice-button)" : "var(--spice-button-disabled)", isActive ? "#000" : "var(--spice-text)");
                toggleBtn.style.minWidth = "30px";
                toggleBtn.style.padding = "2px 5px";

                toggleBtn.onclick = (e) => {
                    e.preventDefault();

                    const exclusives = ["attachedToProgress", "followMouse", "dvdBounce", "rainFall"];
                    if (exclusives.includes(activeField)) {
                        if (!gif[activeField]) {
                            if (activeField === "attachedToProgress" || activeField === "followMouse") {
                                savedGifs.forEach(g => g[activeField] = false);
                            }
                            exclusives.forEach(ef => gif[ef] = false);
                            gif[activeField] = true;
                        } else {
                            gif[activeField] = false;
                        }
                        Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                        renderGifs();
                        setTimeout(() => { updateListUI(); }, 10);
                        return;
                    }

                    isActive = !isActive;
                    gif[activeField] = isActive;
                    toggleBtn.innerText = isActive ? "ON" : "OFF";
                    toggleBtn.style.background = isActive ? "var(--spice-button)" : "var(--spice-button-disabled)";
                    toggleBtn.style.color = isActive ? "#000" : "var(--spice-text)";
                    Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                };

                leftContainer.appendChild(labelText);
                leftContainer.appendChild(toggleBtn);

                if (qtyField) {
                    const qtyInput = document.createElement("input");
                    qtyInput.type = "number";
                    qtyInput.min = "1";
                    qtyInput.max = "150";
                    qtyInput.value = gif[qtyField] || 15;
                    qtyInput.style.width = "38px";
                    qtyInput.style.background = "var(--spice-main)";
                    qtyInput.style.color = "var(--spice-text)";
                    qtyInput.style.border = "1px solid var(--spice-button-disabled)";
                    qtyInput.style.borderRadius = "4px";
                    qtyInput.style.padding = "2px 2px 2px 4px";
                    qtyInput.style.fontSize = "11px";
                    qtyInput.style.textAlign = "center";

                    qtyInput.onchange = (e) => {
                        gif[qtyField] = parseInt(e.target.value) || 15;
                        Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                        if (gif[activeField]) renderGifs();
                    };
                    leftContainer.appendChild(qtyInput);
                }

                wrapper.appendChild(leftContainer);

                if (isColorPicker) {
                    const colorInput = document.createElement("input");
                    colorInput.type = "color";
                    colorInput.value = gif.tintColor || "#e91e63";
                    colorInput.style.width = "40%";
                    colorInput.style.height = "20px";
                    colorInput.style.border = "none";
                    colorInput.style.padding = "0";
                    colorInput.style.background = "transparent";
                    colorInput.style.cursor = "pointer";

                    colorInput.oninput = (e) => {
                        gif.tintColor = e.target.value;
                        if (!isActive) {
                            isActive = true;
                            gif[activeField] = true;
                            toggleBtn.innerText = "ON";
                            toggleBtn.style.background = "var(--spice-button)";
                            toggleBtn.style.color = "#000";
                        }
                        Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                    };
                    wrapper.appendChild(colorInput);
                } else if (speedField) {
                    const rightContainer = document.createElement("div");
                    rightContainer.style.display = "flex";
                    rightContainer.style.alignItems = "center";
                    rightContainer.style.gap = "5px";
                    rightContainer.style.width = "40%";

                    const slider = document.createElement("input");
                    slider.type = "range";
                    slider.min = "1";
                    slider.max = "30";
                    slider.step = "1";
                    slider.value = gif[speedField];
                    slider.className = "gif-manager-slider";
                    slider.style.flex = "1 1 100%";

                    slider.oninput = (e) => {
                        gif[speedField] = parseInt(e.target.value);
                        Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                    };
                    rightContainer.appendChild(slider);
                    wrapper.appendChild(rightContainer);
                }

                return wrapper;
            }

            effectsContainer.appendChild(createEffectToggle("Color", true, "tint", "tintColor"));
            effectsContainer.appendChild(createEffectToggle("Rainbow", false, "rainbow", "rainbowSpeed"));
            effectsContainer.appendChild(createEffectToggle("Auto-Spin", false, "spin", "spinSpeed"));
            effectsContainer.appendChild(createEffectToggle("3D Flip", false, "autoFlip", "flipSpeed"));
            
            effectsContainer.appendChild(createEffectToggle("DVD Bounce", false, "dvdBounce", "dvdSpeed"));
            effectsContainer.appendChild(createEffectToggle("Follow Mouse", false, "followMouse", null));
            effectsContainer.appendChild(createEffectToggle("Prog Bar", false, "attachedToProgress", null));
            effectsContainer.appendChild(createEffectToggle("Rain Fall", false, "rainFall", "rainSpeed", "rainCount"));

            item.appendChild(topRow);
            item.appendChild(slidersContainer);
            item.appendChild(effectsContainer);
            listContainer.appendChild(item);
        });
    }

    function toggleInfo() {
        const isInfoVisible = infoContent.style.display === "flex";

        if (isInfoVisible) {
            infoContent.style.display = "none";
            modalContent.style.display = "flex";
            isEditMode = true;

            const modal = document.querySelector("generic-modal");
            if (modal) {
                modal.classList.remove("gif-manager-info-active");
                const titleEl = modal.querySelector("h1");
                if (titleEl && titleEl.dataset.originalText) {
                    titleEl.innerText = titleEl.dataset.originalText;
                    titleEl.classList.add("gif-manager-rainbow-text");
                }
            }
        } else {
            isEditMode = false;
            modalContent.style.display = "none";
            infoContent.style.display = "flex";

            const modal = document.querySelector("generic-modal");
            if (modal) {
                modal.classList.add("gif-manager-info-active");
                const titleEl = modal.querySelector("h1");
                if (titleEl) {
                    if (!titleEl.dataset.originalText) {
                        titleEl.dataset.originalText = titleEl.innerText;
                    }
                    titleEl.innerText = "How it works";
                    titleEl.classList.remove("gif-manager-rainbow-text");
                }
            }
        }
        renderGifs();
    }

    let tenorNextToken = "";
    let currentTenorQuery = "";

    function openSettings() {
        modalContent.style.display = "flex";
        infoContent.style.display = "none";
        updateListUI();

        isEditMode = true;
        renderGifs();

        Spicetify.PopupModal.display({
            title: "ADHDfy",
            content: mainModalContainer,
            isLarge: true
        });

        const injectInfoBtn = () => {
            const modal = document.querySelector("generic-modal");
            if (!modal) return false;
            const closeBtn = modal.querySelector('button[aria-label="Close"], button[aria-label="Закрыть"], .main-trackCreditsModal-closeBtn');
            if (!closeBtn) return false;

            if (!document.getElementById("gif-manager-info-btn")) {
                const header = closeBtn.parentNode;
                const titleEl = header.querySelector("h1");
                if (titleEl) {
                    titleEl.style.marginRight = "auto";
                    titleEl.classList.add("gif-manager-rainbow-text");
                }

                const infoBtn = document.createElement("button");
                infoBtn.id = "gif-manager-info-btn";
                infoBtn.innerHTML = `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
                infoBtn.style.background = "transparent";
                infoBtn.style.border = "none";
                infoBtn.style.color = "var(--spice-subtext)";
                infoBtn.style.cursor = "default";
                infoBtn.style.display = "flex";
                infoBtn.style.alignItems = "center";
                infoBtn.style.justifyContent = "center";
                infoBtn.style.marginRight = "8px";
                infoBtn.style.position = "relative";
                infoBtn.style.top = "1px";

                infoBtn.onmouseover = () => {
                    infoBtn.style.color = "var(--spice-text)";
                    infoBtn.style.transform = "scale(1.1)";
                };
                infoBtn.onmouseout = () => {
                    infoBtn.style.color = "var(--spice-subtext)";
                    infoBtn.style.transform = "scale(1)";
                };

                infoBtn.onclick = toggleInfo;

                header.insertBefore(infoBtn, closeBtn);
            }
            return true;
        };

        if (!injectInfoBtn()) {
            const observer = new MutationObserver((mutations, obs) => {
                if (injectInfoBtn()) {
                    obs.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => observer.disconnect(), 2000);
        }

        const checkCloseInterval = setInterval(() => {
            if (!document.body.contains(mainModalContainer)) {
                clearInterval(checkCloseInterval);
                isEditMode = false;
                renderGifs();
                const oldBtn = document.getElementById("gif-manager-info-btn");
                if (oldBtn) oldBtn.remove();
            }
        }, 200);

        const browseBtn = addForm.querySelector("#browse-file-btn");
        const fileInputHidden = addForm.querySelector("#file-input-hidden");

        let pendingDirectUploadBase64 = null;

        if (browseBtn && fileInputHidden) {
            browseBtn.style.background = "var(--spice-card)";
            browseBtn.style.color = "var(--spice-text)";
            browseBtn.style.border = "1px solid var(--spice-button-disabled)";
            browseBtn.innerText = "Browse File";
            fileInputHidden.value = "";

            browseBtn.onclick = (e) => {
                e.preventDefault();
                fileInputHidden.click();
            };

            fileInputHidden.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const validExt = /\.(jpg|jpeg|png|gif|webp)$/i;
                    if (!validExt.test(file.name)) {
                        showCustomNotification("Error: Unsupported file format. Please use JPG, PNG, GIF, or WEBP.", true);
                        fileInputHidden.value = "";
                        return;
                    }

                    if (file.size > 2.5 * 1024 * 1024) {
                        showCustomNotification("Warning: Files larger than 2.5MB might exceed limits.", true);
                    }

                    browseBtn.style.background = "#1ed760";
                    browseBtn.style.color = "#000";
                    browseBtn.style.border = "1px solid transparent";
                    browseBtn.innerText = "Selected";

                    const urlInput = addForm.querySelector("#gif-url");
                    if (urlInput) urlInput.value = "";

                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        pendingDirectUploadBase64 = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            };

            const gifUrlInput = addForm.querySelector("#gif-url");
            if (gifUrlInput) {
                gifUrlInput.oninput = () => {
                    if (pendingDirectUploadBase64) {
                        pendingDirectUploadBase64 = null;
                        browseBtn.style.background = "var(--spice-card)";
                        browseBtn.style.color = "var(--spice-text)";
                        browseBtn.style.border = "1px solid var(--spice-button-disabled)";
                        browseBtn.innerText = "Browse File";
                        fileInputHidden.value = "";
                    }
                };
            }
        }

        const searchBtn = addForm.querySelector("#search-gif-btn");
        const tenorContainer = addForm.querySelector("#tenor-search-container");
        const tenorInput = addForm.querySelector("#tenor-search-input");
        const tenorGrid = addForm.querySelector("#tenor-results-grid");
        const tenorLoading = addForm.querySelector("#tenor-loading");
        const tenorLoadMoreBtn = addForm.querySelector("#tenor-load-more");
        const gifUrlInputRef = addForm.querySelector("#gif-url");

        if (searchBtn && tenorContainer) {
            const performTenorSearch = (query, isLoadMore = false) => {
                if (!query.trim()) return;

                if (!isLoadMore) {
                    tenorGrid.innerHTML = "";
                    tenorNextToken = "";
                    currentTenorQuery = query;
                    if (tenorLoadMoreBtn) tenorLoadMoreBtn.style.display = "none";
                    tenorLoading.style.display = "block";
                } else {
                    if (tenorLoadMoreBtn) tenorLoadMoreBtn.innerText = "Loading...";
                }

                let fetchUrl = `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=24`;
                if (isLoadMore && tenorNextToken) {
                    fetchUrl += `&pos=${tenorNextToken}`;
                }

                fetch(fetchUrl)
                    .then(res => res.json())
                    .then(data => {
                        if (!isLoadMore) {
                            tenorLoading.style.display = "none";
                            tenorGrid.innerHTML = "";
                        } else {
                            if (tenorLoadMoreBtn) tenorLoadMoreBtn.innerText = "Load More";
                        }
                        
                        if (!data.results || data.results.length === 0) {
                            if (!isLoadMore) {
                                tenorGrid.innerHTML = "<p style='grid-column: 1 / -1; text-align: center; color: var(--spice-subtext);'>No results found.</p>";
                            }
                            if (tenorLoadMoreBtn) tenorLoadMoreBtn.style.display = "none";
                            return;
                        }

                        tenorNextToken = data.next || "";
                        if (tenorLoadMoreBtn) {
                            if (tenorNextToken && data.results.length >= 24) {
                                tenorLoadMoreBtn.style.display = "block";
                            } else {
                                tenorLoadMoreBtn.style.display = "none";
                            }
                        }

                        data.results.forEach(item => {
                            const img = document.createElement("img");
                            img.src = item.media[0].tinygif.url; // Use tinygif for extremely fast UI 
                            img.style.width = "100%";
                            img.style.height = "80px";
                            img.style.objectFit = "cover";
                            img.style.borderRadius = "4px";
                            img.style.cursor = "pointer";
                            img.style.transition = "transform 0.2s ease";
                            img.onmouseover = () => img.style.transform = "scale(1.05)";
                            img.onmouseout = () => img.style.transform = "scale(1)";

                            img.onclick = () => {
                                if (gifUrlInputRef) gifUrlInputRef.value = item.media[0].gif.url;

                                if (pendingDirectUploadBase64) {
                                    pendingDirectUploadBase64 = null;
                                    const bBtn = document.getElementById("browse-file-btn");
                                    if (bBtn) {
                                        bBtn.style.background = "var(--spice-card)";
                                        bBtn.style.color = "var(--spice-text)";
                                        bBtn.style.border = "1px solid var(--spice-button-disabled)";
                                        bBtn.innerText = "Browse File";
                                    }
                                    const fInput = document.getElementById("file-input-hidden");
                                    if (fInput) fInput.value = "";
                                }

                                tenorContainer.style.display = "none";
                                searchBtn.style.background = "var(--spice-card)";
                                searchBtn.style.color = "var(--spice-text)";
                                showCustomNotification("Media Selected! Click Add to import.", false);
                            };
                            tenorGrid.appendChild(img);
                        });
                    })
                    .catch(err => {
                        if (isLoadMore) {
                            if (tenorLoadMoreBtn) tenorLoadMoreBtn.innerText = "Load More";
                        } else {
                            tenorLoading.style.display = "none";
                            tenorGrid.innerHTML = "<p style='grid-column: 1 / -1; text-align: center; color: #e22134;'>Failed to load GIFs. Check connection.</p>";
                        }
                        console.error("GifManager Tenor API Error:", err);
                    });
            };

            if (tenorLoadMoreBtn) {
                tenorLoadMoreBtn.onclick = (e) => {
                    e.preventDefault();
                    performTenorSearch(currentTenorQuery, true);
                };
            }

            const executeBtn = addForm.querySelector("#tenor-execute-btn");
            if (executeBtn) {
                executeBtn.onclick = (e) => {
                    e.preventDefault();
                    if (tenorInput.value.trim()) performTenorSearch(tenorInput.value);
                };
            }

            searchBtn.onclick = (e) => {
                e.preventDefault();
                const isHidden = tenorContainer.style.display === "none";
                tenorContainer.style.display = isHidden ? "flex" : "none";
                if (isHidden) {
                    searchBtn.style.background = "var(--spice-button)";
                    searchBtn.style.color = "#000";
                    tenorInput.focus();
                    if (tenorGrid.innerHTML === "") {
                        performTenorSearch("memes");
                    }
                } else {
                    searchBtn.style.background = "var(--spice-card)";
                    searchBtn.style.color = "var(--spice-text)";
                }
            };

            tenorInput.onkeydown = (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (tenorInput.value.trim()) performTenorSearch(tenorInput.value);
                }
            };
        }

        const addGifBtn = addForm.querySelector("#add-gif-btn");
        if (addGifBtn) {
            addGifBtn.onclick = () => {
                let url = addForm.querySelector("#gif-url").value;
                if (pendingDirectUploadBase64) {
                    url = pendingDirectUploadBase64;
                }

                const sizeInput = addForm.querySelector("#gif-size");
                const size = sizeInput && sizeInput.value ? sizeInput.value : 50;

            if (url) {
                const anchor = "[data-testid='now-playing-widget']";
                const anchorEl = document.querySelector(anchor);

                let startXPct = 0.5;
                let startYPct = 0.5;

                if (anchorEl && anchorEl.getBoundingClientRect().width > 0) {
                    const rect = anchorEl.getBoundingClientRect();
                    const screenCenterX = window.innerWidth / 2;
                    const screenCenterY = window.innerHeight / 2;

                    startXPct = (screenCenterX - rect.left) / rect.width;
                    startYPct = (screenCenterY - rect.top) / rect.height;
                }

                savedGifs.unshift({
                    url,
                    anchor,
                    size: parseInt(size),
                    xPct: startXPct,
                    yPct: startYPct,
                    x: 0,
                    y: 0,
                    flipped: false,
                    opacity: 1,
                    rotation: 0,
                    visible: true,
                    tint: false,
                    tintColor: "#e91e63",
                    rainbow: false,
                    rainbowSpeed: 5,
                    spin: false,
                    spinSpeed: 5,
                    autoFlip: false,
                    flipSpeed: 5,
                    attachedToProgress: false,
                    followMouse: false,
                    dvdBounce: false,
                    dvdSpeed: 5,
                    rainFall: false,
                    rainSpeed: 5,
                    rainCount: 15,
                    crop: { t: 0, r: 0, b: 0, l: 0 }
                });

                try {
                    Spicetify.LocalStorage.set("MyCustomGifs", JSON.stringify(savedGifs));
                } catch (err) {
                    savedGifs.shift(); 
                    showCustomNotification("Error: Storage limit exceeded! Could not add local file.", true);
                    return;
                }

                renderGifs();
                updateListUI();

                document.getElementById("gif-url").value = "";
                document.getElementById("gif-size").value = "";
                pendingDirectUploadBase64 = null;

                if (browseBtn) {
                    browseBtn.style.background = "var(--spice-card)";
                    browseBtn.style.color = "var(--spice-text)";
                    browseBtn.style.border = "1px solid var(--spice-button-disabled)";
                    browseBtn.innerText = "Browse File";
                }
                if (document.getElementById("file-input-hidden")) {
                    document.getElementById("file-input-hidden").value = "";
                }
            }
        };
        }
    }

    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>`;


    new Spicetify.Topbar.Button("ADHDfy", iconSvg, () => openSettings());

    renderGifs();
})();