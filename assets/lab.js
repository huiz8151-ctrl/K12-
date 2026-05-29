const force1Input = document.querySelector("#force1");
const force2Input = document.querySelector("#force2");
const dir1Input = document.querySelector("#dir1");
const dir2Input = document.querySelector("#dir2");
const stateText = document.querySelector("#stateText");
const detailText = document.querySelector("#detailText");
const records = document.querySelector("#records");
const recordBtn = document.querySelector("#recordBtn");
const resetBtn = document.querySelector("#resetBtn");
const canvas = document.querySelector("#labCanvas");

if (
  force1Input &&
  force2Input &&
  dir1Input &&
  dir2Input &&
  stateText &&
  detailText &&
  records &&
  recordBtn &&
  resetBtn &&
  canvas
) {
  const ctx = canvas.getContext("2d");

  function signedForce(magnitude, direction) {
    return direction === "right" ? magnitude : -magnitude;
  }

  function calcState() {
    const f1 = signedForce(Number(force1Input.value), dir1Input.value);
    const f2 = signedForce(Number(force2Input.value), dir2Input.value);
    const net = f1 + f2;
    const absNet = Math.abs(net);

    if (absNet === 0) {
      return {
        label: "平衡状态",
        detail: "合力为 0N。若物体原本静止则保持静止，原本运动则做匀速直线运动。",
        balanced: true,
        f1,
        f2,
        net
      };
    }

    const dir = net > 0 ? "向右" : "向左";
    return {
      label: "非平衡状态",
      detail: `合力为 ${absNet}N，方向${dir}。继续调整大小和方向，尝试达到平衡。`,
      balanced: false,
      f1,
      f2,
      net
    };
  }

  function drawArrow(x, y, length, rightward, color) {
    const end = rightward ? x + length : x - length;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(end, y);
    ctx.stroke();

    ctx.beginPath();
    if (rightward) {
      ctx.moveTo(end, y);
      ctx.lineTo(end - 10, y - 6);
      ctx.lineTo(end - 10, y + 6);
    } else {
      ctx.moveTo(end, y);
      ctx.lineTo(end + 10, y - 6);
      ctx.lineTo(end + 10, y + 6);
    }
    ctx.closePath();
    ctx.fill();
  }

  function draw(state) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#eaf2ff";
    ctx.fillRect(0, height * 0.74, width, height * 0.26);

    const boxW = Math.min(130, width * 0.24);
    const boxH = Math.min(82, height * 0.28);
    const boxX = width / 2 - boxW / 2;
    const boxY = height * 0.74 - boxH;

    ctx.fillStyle = "#fbbf24";
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 2;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = "#4b2e00";
    ctx.font = "700 15px 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText("受力物体", boxX + 24, boxY + boxH / 2 + 5);

    const scale = 8;
    drawArrow(boxX + boxW / 2, boxY + boxH / 2 - 24, Math.abs(state.f1) * scale, state.f1 >= 0, "#ef4444");
    drawArrow(boxX + boxW / 2, boxY + boxH / 2 + 24, Math.abs(state.f2) * scale, state.f2 >= 0, "#2563eb");

    ctx.fillStyle = "#1f2937";
    ctx.font = "600 13px 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText(`F1: ${Math.abs(state.f1)}N ${state.f1 >= 0 ? "右" : "左"}`, 14, 24);
    ctx.fillText(`F2: ${Math.abs(state.f2)}N ${state.f2 >= 0 ? "右" : "左"}`, 14, 44);
  }

  function update() {
    const state = calcState();
    stateText.textContent = state.label;
    detailText.textContent = state.detail;
    stateText.className = state.balanced ? "notice" : "notice warn";
    draw(state);
  }

  function addRecord() {
    const state = calcState();
    const li = document.createElement("li");
    li.textContent =
      `F1=${Math.abs(state.f1)}N(${state.f1 >= 0 ? "右" : "左"}), ` +
      `F2=${Math.abs(state.f2)}N(${state.f2 >= 0 ? "右" : "左"}) -> ${state.label}`;
    records.prepend(li);
  }

  [force1Input, force2Input, dir1Input, dir2Input].forEach((el) => {
    el.addEventListener("input", update);
    el.addEventListener("change", update);
  });

  recordBtn.addEventListener("click", addRecord);
  resetBtn.addEventListener("click", () => {
    force1Input.value = "6";
    force2Input.value = "6";
    dir1Input.value = "right";
    dir2Input.value = "left";
    update();
  });

  window.addEventListener("resize", update);
  update();
}
