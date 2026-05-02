export class TreeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.nodes = [];
    this.nodeMap = new Map();
    this.transform = { x: 0, y: 0, scale: 0.8 };
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.imageCache = new Map();
    this.animation = null;

    this._initResize();
    this._bindEvents();
  }

  /**
   * Monitors the size of the parent container without causing memory leaks
   */
  _initResize() {
    this.resizeObserver = new ResizeObserver(() => {
      const parent = this.canvas.parentElement;
      if (parent) {
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.draw();
      }
    });
    this.resizeObserver.observe(this.canvas.parentElement);
  }

  /**
   * Complete clearing on page change
   */
  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.animation) cancelAnimationFrame(this.animation.id);
    this.canvas.replaceWith(this.canvas.cloneNode(true));
  }

  setData({ nodes = [], edges = [], layerLabels = [] } = {}) {
    this.nodes = nodes;
    this.edges = edges;
    this.layerLabels = layerLabels;
    this.nodeMap.clear();
    this.nodes.forEach((n) => this.nodeMap.set(n.id, n));

    if (this.nodes.length > 0) {
      const root = this.nodes.find((n) => n.layer === 0) || this.nodes[0];
      this.focusOn(root.id, false);
    }
  }

  _constrainTransform() {
    if (!this.nodes.length) return;

    const padding = 200;
    const minX = Math.min(...this.nodes.map((n) => n.x)) - padding - 100;
    const maxX = Math.max(...this.nodes.map((n) => n.x + n.width)) + padding;
    const minY = Math.min(...this.nodes.map((n) => n.y)) - padding;
    const maxY = Math.max(...this.nodes.map((n) => n.y + n.height)) + padding;

    const screenHeight = this.canvas.height;
    this.transform.y = Math.min(
      this.transform.y,
      screenHeight / 2 - minY * this.transform.scale,
    );
    this.transform.y = Math.max(
      this.transform.y,
      screenHeight / 2 - maxY * this.transform.scale,
    );

    const screenWidth = this.canvas.width;
    this.transform.x = Math.min(
      this.transform.x,
      screenWidth / 2 - minX * this.transform.scale,
    );
    this.transform.x = Math.max(
      this.transform.x,
      screenWidth / 2 - maxX * this.transform.scale,
    );
  }

  _bindEvents() {
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      if (this.animation) cancelAnimationFrame(this.animation.id);
    });

    window.addEventListener("mouseup", () => (this.isDragging = false));

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      this.transform.x += e.clientX - this.lastMouse.x;
      this.transform.y += e.clientY - this.lastMouse.y;

      this._constrainTransform();

      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.draw();
    });

    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        const newScale = Math.min(
          Math.max(0.2, this.transform.scale + delta),
          2,
        );

        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        this.transform.x =
          mx - (mx - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y =
          my - (my - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;

        this._constrainTransform();
        this.draw();
      },
      { passive: false },
    );
  }

  _getImage(url, fallback) {
    const src = url || fallback;
    if (this.imageCache.has(src)) return this.imageCache.get(src);

    const img = new Image();
    this.imageCache.set(src, null);
    img.onload = () => {
      this.imageCache.set(src, img);
      this.draw();
    };
    img.src = src;
    return null;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.translate(this.transform.x, this.transform.y);
    this.ctx.scale(this.transform.scale, this.transform.scale);

    if (this.nodes?.length > 0 && this.layerLabels?.length > 0) {
      const stickyX = (70 - this.transform.x) / this.transform.scale;
      const maxY = Math.max(...this.nodes.map((n) => n.y));

      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      this.ctx.lineWidth = 2 / this.transform.scale;
      this.ctx.beginPath();
      this.ctx.moveTo(stickyX, -200);
      this.ctx.lineTo(stickyX, maxY + 400);
      this.ctx.stroke();

      this.layerLabels.forEach((label) => {
        const textY = label.y + 110;

        this.ctx.strokeStyle = "rgba(126, 184, 255, 0.4)";
        this.ctx.beginPath();
        this.ctx.moveTo(stickyX - 10, textY);
        this.ctx.lineTo(stickyX + 5, textY);
        this.ctx.stroke();

        this.ctx.fillStyle = "rgba(126, 184, 255, 0.8)";
        const fontSize = Math.max(12, 14 / this.transform.scale);
        this.ctx.font = `bold ${fontSize}px Montserrat`;
        this.ctx.textAlign = "right";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(label.text, stickyX - 20, textY);
      });
    }

    this.ctx.strokeStyle = "rgba(126, 184, 255, 0.4)";
    this.ctx.lineWidth = 3;

    this.edges?.forEach((edge) => {
      this.ctx.beginPath();
      const startNode = edge.path[0];
      this.ctx.moveTo(
        startNode.x + startNode.width / 2,
        startNode.y + startNode.height - 20,
      );

      for (let i = 1; i < edge.path.length; i++) {
        const prev = edge.path[i - 1];
        const curr = edge.path[i];

        const sX = prev.x + prev.width / 2;
        const sY = prev.isVirtual
          ? prev.y + prev.height
          : prev.y + prev.height - 20;
        const eX = curr.x + curr.width / 2;
        const eY = curr.isVirtual ? curr.y : curr.y + 10;

        const curveOffset = Math.min(Math.abs(eY - sY) / 2, 80);
        this.ctx.bezierCurveTo(
          sX,
          sY + curveOffset,
          eX,
          eY - curveOffset,
          eX,
          eY,
        );

        if (curr.isVirtual) {
          this.ctx.lineTo(curr.x + curr.width / 2, curr.y + curr.height);
        }
      }
      this.ctx.stroke();
    });

    this.nodes?.forEach((node) => {
      this.ctx.fillStyle = "rgba(25, 25, 40, 0.7)";
      this.ctx.beginPath();
      this.ctx.roundRect(node.x, node.y, node.width, node.height, 12);
      this.ctx.fill();

      this.ctx.strokeStyle = node.isPhantom
        ? "rgba(255,255,255,0.1)"
        : "rgba(126, 184, 255, 0.5)";
      this.ctx.stroke();

      const imgW = 100;
      const imgH = 150;
      const imgX = node.x + (node.width - imgW) / 2;
      const imgY = node.y + 12;

      const img = this._getImage(node.avatarUrl, node.fallbackAvatar);
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.roundRect(imgX, imgY, imgW, imgH, 6);
      this.ctx.clip();

      if (img) {
        const scale = Math.max(imgW / img.width, imgH / img.height);
        const nw = img.width * scale;
        const nh = img.height * scale;
        this.ctx.drawImage(
          img,
          imgX + (imgW - nw) / 2,
          imgY + (imgH - nh) / 2,
          nw,
          nh,
        );
      } else {
        this.ctx.fillStyle = "rgba(255,255,255,0.05)";
        this.ctx.fill();
      }
      this.ctx.restore();

      this.ctx.textAlign = "center";
      this.ctx.fillStyle = "white";
      this.ctx.font = "bold 13px Montserrat";
      let dName = node.name || "???";
      if (dName.length > 15) dName = dName.substring(0, 13) + "...";
      this.ctx.fillText(dName, node.x + node.width / 2, node.y + 180);

      this.ctx.fillStyle = "rgba(126, 184, 255, 0.8)";
      this.ctx.font = "10px monospace";
      this.ctx.fillText(node.id, node.x + node.width / 2, node.y + 198);

      if (node.birthDate) {
        this.ctx.fillStyle = "rgba(255,255,255,0.4)";
        this.ctx.font = "9px Montserrat";
        this.ctx.fillText(
          node.birthDate,
          node.x + node.width / 2,
          node.y + 212,
        );
      }
    });

    this.ctx.restore();
  }

  focusOn(nodeId, animate = true) {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;
    const tX = this.canvas.width / 2 - (node.x + node.width / 2);
    const tY = this.canvas.height / 2 - (node.y + node.height / 2);

    if (!animate) {
      this.transform.x = tX;
      this.transform.y = tY;
      this.transform.scale = 1;
      this.draw();
      return;
    }

    const start = { ...this.transform };
    const startTime = performance.now();
    const animateFrame = (now) => {
      const p = Math.min((now - startTime) / 500, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      this.transform.x = start.x + (tX - start.x) * ease;
      this.transform.y = start.y + (tY - start.y) * ease;
      this.transform.scale = start.scale + (1 - start.scale) * ease;
      this.draw();
      if (p < 1) this.animation = { id: requestAnimationFrame(animateFrame) };
    };
    this.animation = { id: requestAnimationFrame(animateFrame) };
  }
}
