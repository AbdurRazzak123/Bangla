(function () {
  "use strict";

  const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/1gX73WskIs3D-8IcyPJ24NT0xn1KIEJSjMXOF9nCQqTg/gviz/tq?tqx=out:json&sheet=Ads";

  function getRows(data) {
    const rows = data.table?.rows || [];
    return rows.map(r =>
      (r.c || []).map(c => c && c.v != null ? String(c.v) : "")
    );
  }

  function getHeaderIndex(header, names) {
    return names.map(n => header.indexOf(n)).find(i => i >= 0);
  }

  function loadAds() {
    fetch(SHEET_URL, { cache: "no-store" })
      .then(r => r.text())
      .then(text => {
        const jsonText = text.substring(
          text.indexOf("{"),
          text.lastIndexOf("}") + 1
        );

        const data = JSON.parse(jsonText);
        const rows = getRows(data);

        if (!rows.length) return;

        const header = rows[0].map(x => x.trim());

        const positionIndex = getHeaderIndex(header, ["Position"]);
        const activeIndex = getHeaderIndex(header, ["Active"]);
        const codeIndex = getHeaderIndex(header, ["Ad Code"]);

        if (positionIndex < 0 || activeIndex < 0 || codeIndex < 0) return;

        const ads = rows.slice(1)
          .map(row => ({
            position: (row[positionIndex] || "").trim().toLowerCase(),
            active: (row[activeIndex] || "").trim().toLowerCase(),
            code: row[codeIndex] || ""
          }))
          .filter(ad =>
            ad.active === "yes" &&
            ad.code.trim()
          );

        document.querySelectorAll(".sheet-ad-slot").forEach(slot => {
          const position = (slot.dataset.adSlot || "").trim().toLowerCase();

          const ad = ads.find(x => x.position === position);

          if (!ad) return;

          slot.innerHTML = "";

          const wrap = document.createElement("div");
          wrap.className = "native-ad-desktop-wrap";

          const frame = document.createElement("div");
          frame.className = "native-ad-desktop-canvas";

          /*
           * Native Banner-এর আসল কোড সরাসরি DOM-এর মধ্যে চালানো হবে।
           * iframe ব্যবহার করা হচ্ছে না।
           */
          frame.innerHTML = ad.code;

          wrap.appendChild(frame);
          slot.appendChild(wrap);
        });
      })
      .catch(err => {
        console.error("Ad loader error:", err);
      });
  }

  const style = document.createElement("style");

  style.textContent = `
    .native-ad-desktop-wrap {
      width: 100%;
      overflow: hidden;
      display: flex;
      justify-content: center;
      box-sizing: border-box;
    }

    .native-ad-desktop-canvas {
      width: 1200px;
      min-width: 1200px;
      flex: 0 0 1200px;
      transform-origin: top center;
      box-sizing: border-box;
    }

    @media (max-width: 600px) {
      .native-ad-desktop-wrap {
        height: auto;
      }

      .native-ad-desktop-canvas {
        transform: scale(
          calc((100vw - 10px) / 1200)
        );

        margin-bottom: calc(
          -1 * (1200px - (100vw - 10px))
        );

        transform-origin: top left;
      }
    }
  `;

  document.head.appendChild(style);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAds);
  } else {
    loadAds();
  }
})();
