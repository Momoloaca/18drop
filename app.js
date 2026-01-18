document.addEventListener('DOMContentLoaded', () => {
  const CSV_LINK = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBgu6sD4gognR9fTkUEq32Ruj7XsqQJ2Md4daUld1uzlZ-mQ3Nwhf9cHNIsr67JYL2H7SuAywJsW7i/pub?gid=0&single=true&output=csv";

  let cos = [];
  let allProducts = [];
  let currentFilterTag = null;

  function actualizeazaCos() {
    const totalItems = cos.reduce((s, it) => s + (Number(it.qty) || 0), 0);
    document.getElementById("cart-count").textContent = totalItems;
  }

  // Notifications helper
  function showNotification(msg, type = 'success', timeout = 3000) {
    const container = document.getElementById('notifications');
    if (!container) return;

    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = msg;

    container.appendChild(n);

    setTimeout(() => {
      n.style.transition = 'opacity .25s, transform .25s';
      n.style.opacity = '0';
      n.style.transform = 'translateY(8px)';
    }, timeout - 250);

    setTimeout(() => container.removeChild(n), timeout);
  }

  function formatPrice(n) {
    if (typeof n !== 'number') n = Number(n) || 0;
    return (n % 1 === 0) ? `${n} RON` : `${n.toFixed(2)} RON`;
  }

  function afiseazaCos() {
    const lista = document.getElementById("cart-list");
    lista.innerHTML = "";

    let total = 0;

    cos.forEach((item, i) => {
      const li = document.createElement("li");
      li.style.marginBottom = "10px";
      const qty = Number(item.qty) || 1;
      const qtyLabel = qty > 1 ? `<span style="margin-left:8px; color:#ffd; font-weight:800">x${qty}</span>` : '';
      li.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            ${item.thumb ? `<img class="cart-thumb" src="${item.thumb}" alt="${item.nume}">` : ''}
            <div>
              <div style="font-weight:700">${item.nume} ${qtyLabel}</div>
              <div style="font-size:13px; color:#ddd">Marime: <b>${item.marime}</b></div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700">${formatPrice(item.pret * qty)}</div>
            <button data-i="${i}" class="remove-item" style="margin-top:6px;">Șterge</button>
          </div>
        </div>
      `;
      lista.appendChild(li);

      total += (Number(item.pret) || 0) * qty;
    });

    // total row
    const totalLi = document.createElement('li');
    totalLi.style.marginTop = '12px';
    totalLi.style.borderTop = '1px solid rgba(255,255,255,0.06)';
    totalLi.style.paddingTop = '12px';
    totalLi.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-weight:800;">
        <div>Total</div>
        <div>${formatPrice(total)}</div>
      </div>
    `;
    lista.appendChild(totalLi);

    document.querySelectorAll(".remove-item").forEach(btn => {
      btn.addEventListener("click", e => {
        const index = e.target.dataset.i;
        const it = cos[index];
        if (!it) return;
        if ((Number(it.qty) || 0) > 1) {
          it.qty = Number(it.qty) - 1;
        } else {
          cos.splice(index, 1);
        }
        actualizeazaCos();
        afiseazaCos();
      });
    });
  }

  Papa.parse(CSV_LINK, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {

      const produse = results.data.map(p => {

        const poze = Object.keys(p)
          .filter(key => key.toLowerCase().includes("poza"))
          .flatMap(key => p[key] ? p[key].split(/[;,]/) : [])
          .map(url => url.trim())
          .filter(url => url.length > 5);

        const etichete = (p.eticheta || p.etichete || "").split(",").map(t => t.trim()).filter(Boolean);

        return {
          id: p.id?.trim() || "",
          nume: p.nume?.trim() || "",
          descriere: p.descriere?.trim() || "",
          pret: p.pret ? Number(p.pret.trim()) : 0,
          stoc: p.stoc ? Number(p.stoc.trim()) : 0,
          marimi: p.marimi ? p.marimi.split(",").map(m => m.trim()) : [],
          poze: poze,
          etichete: etichete,
          created: p.created ? Number(p.created.trim()) : 0
        };
      });

      produse.sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D/g, ""));
        const numB = parseInt(b.id.replace(/\D/g, ""));
        return numA - numB;
      });

      // save and initialize categories
      allProducts = produse;
      buildCategoryPanel(allProducts);
      afiseazaProduse(allProducts);
    }
  });

  function afiseazaProduse(produse) {
    const container = document.getElementById("product-grid");
    container.innerHTML = "";

    const displayed = currentFilterTag
      ? (produse || []).filter(p => (p.etichete || []).map(t => t.toLowerCase()).includes(currentFilterTag))
      : (produse || []);

    const modal = document.getElementById('product-modal');
    const modalClose = modal.querySelector('.modal-close');
    const modalThumbs = document.getElementById('modal-thumbs');
    const modalMainImg = document.getElementById('modal-main-img');
    const modalName = document.getElementById('modal-name');
    const modalDesc = document.getElementById('modal-desc');
    const modalPrice = document.getElementById('modal-price');
    const modalSizes = document.getElementById('modal-sizes');
    const modalBtnContainer = document.getElementById('modal-btn-container');
    const modalStock = document.getElementById('modal-stock');

    modalClose.addEventListener('click', () => {
      modal.style.display = 'none';
      document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
    });
    window.addEventListener('click', e => {
      if (e.target == modal) {
        modal.style.display = 'none';
        document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
      }
    });

    displayed.forEach((p, index) => {

      const card = document.createElement("div");
      card.className = "card";
      card.style.position = "relative";

      const badge = index === 0 ? '<span class="badge">NOU</span>' : '';

      const marimiHTML = p.marimi.length > 0
        ? `<div class="sizes">${p.marimi.map(m => `<span class="size">${m}</span>`).join("")}</div>`
        : "";

      const pretHTML = p.stoc === 0
        ? '<div class="price">Indisponibil</div>'
        : `<div class="price">${p.pret} RON</div>`;

      const btnHTML = p.stoc > 0
        ? `<button class="btn add-to-cart">Comandă!</button>`
        : `<span class="btn disabled">Indisponibil</span>`;

      card.innerHTML = `
      ${badge}
      <img src="${p.poze[0]}" alt="${p.nume}">
      <h3>${p.nume}</h3>

      <div class="card-price-size-row">
        ${marimiHTML}
        ${pretHTML}
      </div>

      ${btnHTML}
    `;

      container.appendChild(card);

      const sizeSpans = card.querySelectorAll('.size');
      sizeSpans.forEach(span => {
        span.addEventListener('click', e => {
          e.stopPropagation();
          sizeSpans.forEach(s => s.classList.remove('active'));
          span.classList.add('active');
          // remove selected from other cards, then highlight this card
          document.querySelectorAll('#product-grid .card.selected').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        });
      });

      const addBtn = card.querySelector(".add-to-cart");
      if (addBtn) {
        addBtn.addEventListener("click", e => {
          e.stopPropagation();

          const sizeRequired = p.marimi && p.marimi.length > 0;
          const selectedEl = card.querySelector('.size.active');
          if (sizeRequired && !selectedEl) {
            showNotification('Selectează o mărime înainte de a adăuga în coș', 'error');
            return;
          }


          const marimeSelectata = selectedEl ? selectedEl.textContent : 'Nespecificat';

          // if same product+size already in cart, increment qty
          const existIdx = cos.findIndex(it => it.id === p.id && it.marime === marimeSelectata);
          if (existIdx > -1) {
            cos[existIdx].qty = (Number(cos[existIdx].qty) || 0) + 1;
          } else {
            cos.push({ id: p.id, nume: p.nume, marime: marimeSelectata, pret: p.pret, qty: 1, thumb: p.poze[0] || '' });
          }

          actualizeazaCos();
          showNotification('Produs adăugat în coș', 'success');

          const btn = e.currentTarget;
          btn.classList.add('added');
          setTimeout(() => btn.classList.remove('added'), 800);
        });
      }

      card.addEventListener('click', e => {
        if (e.target.classList.contains('btn') || e.target.classList.contains('size')) return;

        modalMainImg.src = p.poze[0];
        modalName.textContent = p.nume;
        modalDesc.textContent = p.descriere;
        modalPrice.textContent = p.stoc === 0 ? '' : `${p.pret} RON`;
        modalSizes.innerHTML = p.marimi.map(m => `<span class="size">${m}</span>`).join('');
        modalBtnContainer.innerHTML = p.stoc > 0
          ? `<button class="btn add-modal-cart">Comandă!</button>`
          : `<span class="btn disabled">Indisponibil</span>`;
        modalStock.textContent = p.stoc === 0 ? 'Indisponibil' : `Stoc: ${p.stoc}`;

        modalThumbs.innerHTML = "";
        p.poze.forEach((imgSrc, i) => {
          const thumb = document.createElement("img");
          thumb.src = imgSrc;
          thumb.style.width = "70px";
          thumb.style.cursor = "pointer";
          thumb.style.borderRadius = "6px";

          if (i === 0) thumb.classList.add("active");

          thumb.addEventListener("click", () => {
            modalMainImg.src = imgSrc;
            modalThumbs.querySelectorAll("img").forEach(t => t.classList.remove("active"));
            thumb.classList.add("active");
          });

          modalThumbs.appendChild(thumb);
        });

        const modalSizeSpans = modalSizes.querySelectorAll('.size');
        modalSizeSpans.forEach(span => {
          span.addEventListener('click', () => {
            modalSizeSpans.forEach(s => s.classList.remove('active'));
            span.classList.add('active');
          });
        });

        const modalAddBtn = modalBtnContainer.querySelector(".add-modal-cart");
        if (modalAddBtn) {
          modalAddBtn.addEventListener("click", (e) => {
            const sizeRequired = p.marimi && p.marimi.length > 0;
            const selectedEl = modalSizes.querySelector('.size.active');
            if (sizeRequired && !selectedEl) {
              showNotification('Selectează o mărime înainte de a adăuga în coș', 'error');
              return;
            }

            const marimeSelectata = selectedEl ? selectedEl.textContent : 'Nespecificat';

            const existIdx = cos.findIndex(it => it.id === p.id && it.marime === marimeSelectata);
            if (existIdx > -1) {
              cos[existIdx].qty = (Number(cos[existIdx].qty) || 0) + 1;
            } else {
              cos.push({ id: p.id, nume: p.nume, marime: marimeSelectata, pret: p.pret, qty: 1, thumb: p.poze[0] || '' });
            }
            actualizeazaCos();
            showNotification('Produs adăugat în coș', 'success');

            const btn = e.currentTarget;
            btn.classList.add('added');
            setTimeout(() => btn.classList.remove('added'), 800);
          });
        }

        modal.style.display = "flex";
      });

    });

  }

  /* Build category panel from CSV tags (unique + counters) */
  function buildCategoryPanel(produse) {
    const panel = document.getElementById('category-panel');
    if (!panel) return;

    const counts = {};
    (produse || []).forEach(p => (p.etichete || []).forEach(t => { const k = t.trim(); if (!k) return; counts[k] = (counts[k]||0)+1; }));

    const tags = Object.keys(counts).map(t => t.trim()).filter(Boolean).sort((a,b)=>a.localeCompare(b));

    panel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<div>Categorii</div><button id="close-cats" class="cat-close" aria-label="Închide">×</button>`;
    panel.appendChild(header);

    const list = document.createElement('div');
    list.className = 'cat-list';

    const allBtn = document.createElement('button');
    allBtn.className = 'cat-btn' + (currentFilterTag ? '' : ' active');
    allBtn.innerHTML = `<span>Toate</span><span class="cat-count">${produse.length}</span>`;
    allBtn.addEventListener('click', () => {
      currentFilterTag = null;
      panel.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
      allBtn.classList.add('active');
      afiseazaProduse(allProducts);
      toggleCategoryPanel(false);
    });
    list.appendChild(allBtn);

    tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (currentFilterTag === tag.toLowerCase() ? ' active' : '');
      btn.innerHTML = `<span>${tag}</span><span class="cat-count">${counts[tag]||0}</span>`;
      btn.addEventListener('click', () => {
        currentFilterTag = tag.toLowerCase();
        panel.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        afiseazaProduse(allProducts);
        toggleCategoryPanel(false);
      });
      list.appendChild(btn);
    });

    panel.appendChild(list);

    const closeBtn = panel.querySelector('#close-cats');
    if (closeBtn) closeBtn.addEventListener('click', () => toggleCategoryPanel(false));
  }

  function toggleCategoryPanel(open) {
    const panel = document.getElementById('category-panel');
    const toggle = document.getElementById('category-toggle');
    if (!panel || !toggle) return;
    if (open === undefined) open = !panel.classList.contains('open');
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  // hamburger toggle
  const catToggle = document.getElementById('category-toggle');
  if (catToggle) {
    catToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleCategoryPanel(); });
  }

  // close on outside click
  window.addEventListener('click', (e) => {
    const panel = document.getElementById('category-panel');
    const toggle = document.getElementById('category-toggle');
    if (!panel || !toggle) return;
    if (!panel.contains(e.target) && !toggle.contains(e.target)) {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* 🔥 COȘ */
  document.getElementById("cart-btn").addEventListener("click", () => {
    afiseazaCos();
    document.getElementById("cart-modal").style.display = "flex";
  });

  /* 🔥 Închidere modal coș cu X */
  const cartModal = document.getElementById("cart-modal");
  const cartClose = document.querySelector(".cart-close");

  if (cartClose) {
    cartClose.addEventListener("click", () => {
      cartModal.style.display = "none";
    });
  }

  /* 🔥 Închidere modal coș cu click pe fundal */
  window.addEventListener("click", e => {
    if (e.target === cartModal) {
      cartModal.style.display = "none";
    }
  });

  document.getElementById("send-order").addEventListener("click", () => {
    if (cos.length === 0) return;

    let mesaj = "Salut! Vreau să comand:%0A";
    let total = 0;

    cos.forEach(item => {
      const qty = Number(item.qty) || 1;
      const lineTotal = (Number(item.pret) || 0) * qty;
      mesaj += `- ${item.nume} (Marime: ${item.marime})` + (qty > 1 ? ` x${qty}` : '') + ` - ${formatPrice(lineTotal)} (${formatPrice(item.pret)} buc)%0A`;
      total += lineTotal;
    });

    mesaj += `%0ATotal: ${formatPrice(total)}`;

    window.open(`https://wa.me/40760706684?text=${mesaj}`, "_blank");
  });

  // --- Modal image navigation: swipe (mobile) + keyboard arrows (desktop) ---
  (function setupModalNavigation(){
    const modal = document.getElementById('product-modal');
    const modalMainImg = document.getElementById('modal-main-img');
    const modalThumbs = document.getElementById('modal-thumbs');

    if (!modal || !modalMainImg || !modalThumbs) return;

    let images = [];
    let index = 0;

    function updateImagesFromThumbs(){
      images = Array.from(modalThumbs.querySelectorAll('img')).map(i=>i.src);
      const active = modalThumbs.querySelector('img.active') || modalThumbs.querySelector('img');
      if (active) index = images.indexOf(active.src) >= 0 ? images.indexOf(active.src) : 0;
    }

    // Observe thumb changes (when modal is opened we rebuild thumbs)
    const obs = new MutationObserver(updateImagesFromThumbs);
    obs.observe(modalThumbs, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class'] });

    function showImageAt(i){
      if (!images || images.length === 0) return;
      index = ((i % images.length) + images.length) % images.length;
      modalMainImg.src = images[index];
      modalThumbs.querySelectorAll('img').forEach((t, ti) => t.classList.toggle('active', ti === index));
    }

    function nextImage(){ showImageAt(index + 1); }
    function prevImage(){ showImageAt(index - 1); }

    // Touch swipe
    let touchStartX = 0;
    let touchEndX = 0;
    const MIN_SWIPE = 40; // px

    modalMainImg.addEventListener('touchstart', (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    modalMainImg.addEventListener('touchend', (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      touchEndX = e.changedTouches[0].clientX;
      const dx = touchEndX - touchStartX;
      if (Math.abs(dx) > MIN_SWIPE) {
        if (dx < 0) nextImage(); else prevImage();
      }
    }, { passive: true });

    // Keyboard arrows on desktop when modal visible
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      // only react when modal is open/visible
      const style = window.getComputedStyle(modal);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

      updateImagesFromThumbs();
      if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      }
    });

    // Ensure images array is synced when clicking thumbnails too
    modalThumbs.addEventListener('click', (e) => {
      const t = e.target.closest('img');
      if (!t) return;
      updateImagesFromThumbs();
      const clickedIndex = images.indexOf(t.src);
      if (clickedIndex >= 0) showImageAt(clickedIndex);
    });

    // initial sync in case thumbs already present
    updateImagesFromThumbs();
  })();

});