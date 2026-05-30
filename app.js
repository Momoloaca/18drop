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
          .filter(key => /^poz/i.test(key))
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
      // build the standalone carousel (uses same images/data)
      try { if (typeof buildSimpleCarousel === 'function') buildSimpleCarousel(allProducts); else if (typeof buildProductCarousel === 'function') buildProductCarousel(allProducts); } catch(e){console.warn('Carousel build failed', e);}    
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

  /* Enhanced premium carousel
     - luxurious card layout (glass + neon accents)
     - autoplay with seamless loop via clones
     - pointer drag + inertia
     - 3D hover and floating image
     - reuse product modal and add-to-cart behaviors
  */
  function buildProductCarousel(produse) {
    const container = document.getElementById('product-carousel');
    if (!container) return;
    const track = container.querySelector('.carousel-track');
    if (!track) return;
    track.innerHTML = '';

    const source = (produse || []).slice(0, 12);
    if (source.length === 0) return;

    // create items
    source.forEach(p => {
      const item = document.createElement('div');
      item.className = 'carousel-item lux';

      const sizesHTML = (p.marimi || []).slice(0,5).map(m => `<span class="size">${m}</span>`).join('');
      const rating = 4 + Math.round(Math.random());
      const stars = '★'.repeat(rating) + '☆'.repeat(5-rating);

      item.innerHTML = `
        <div class="card-plate">
          <div class="img-wrap">
            <img src="${p.poze[0] || ''}" alt="${p.nume}">
            <div class="ambient-glow"></div>
          </div>
          <div class="meta">
            <div class="badges"><span class="badge new-drop">NEW DROP</span>${p.stoc && p.stoc < 6 ? '<span class="badge limited">LIMITED STOCK</span>' : ''}</div>
            <h4 class="title">${p.nume}</h4>
            <div class="sizes-row">${sizesHTML}</div>
            <div class="stars">${stars}</div>
          </div>
        </div>
      `;

      // open modal when clicking image or title

        const imgWrap = item.querySelector('.img-wrap');
        if (imgWrap) imgWrap.addEventListener('click', () => itemOpenModal(p));
        const titleEl = item.querySelector('.title');
        if (titleEl) titleEl.addEventListener('click', () => itemOpenModal(p));

        // favorite toggle (optional element)
        const fav = item.querySelector('.fav-btn');
        if (fav) {
          fav.addEventListener('click', (e) => { e.stopPropagation(); fav.classList.toggle('active'); fav.textContent = fav.classList.contains('active') ? '♥' : '♡'; });
        }

      // size selection inside carousel card
      item.querySelectorAll('.sizes-row .size').forEach(s => s.addEventListener('click', (e) => { e.stopPropagation(); item.querySelectorAll('.sizes-row .size').forEach(x=>x.classList.remove('active')); s.classList.add('active'); }));

      // add-to-cart behavior (carousel cards may not have this button)
      const addBtn = item.querySelector('.add-to-cart');
      if (addBtn) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const sizeEl = item.querySelector('.sizes-row .size.active');
          const size = sizeEl ? sizeEl.textContent : 'Nespecificat';
          const existIdx = cos.findIndex(it => it.id === p.id && it.marime === size);
          if (existIdx > -1) cos[existIdx].qty = (Number(cos[existIdx].qty) || 0) + 1; else cos.push({ id: p.id, nume: p.nume, marime: size, pret: p.pret, qty: 1, thumb: p.poze[0] || '' });
          actualizeazaCos();
          addBtn.classList.add('added'); setTimeout(()=>addBtn.classList.remove('added'), 900);
          showNotification('Produs adăugat în coș', 'success');
        });
      }

      // ensure image fallback if external resource fails
      const imgEl = item.querySelector('.img-wrap img');
      if (imgEl) {
        imgEl.loading = 'lazy';
        imgEl.onerror = function(){
          try{
            this.onerror = null;
            const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='%23060b0b'/><text x='50%' y='50%' fill='%23ffffff' font-family='Arial,Helvetica,sans-serif' font-size='28' dominant-baseline='middle' text-anchor='middle'>Imagine indisponibilă</text></svg>`;
            this.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
            this.style.objectFit = 'contain';
          }catch(e){ /* swallow */ }
        };
      }
      track.appendChild(item);
    });

    // clone children once to allow smoother looping
    const children = Array.from(track.children);
    children.forEach(ch => track.appendChild(ch.cloneNode(true)));

    // ensure we start at the beginning (avoid clones or previous scroll offset hiding items)
    try { track.scrollLeft = 0; track.scrollTo({ left: 0 }); } catch(e) { /* ignore */ }

    // helper to open modal with product data
    function itemOpenModal(p) {
      const modal = document.getElementById('product-modal');
      const modalThumbs = document.getElementById('modal-thumbs');
      const modalMainImg = document.getElementById('modal-main-img');
      const modalName = document.getElementById('modal-name');
      const modalDesc = document.getElementById('modal-desc');
      const modalPrice = document.getElementById('modal-price');
      const modalSizes = document.getElementById('modal-sizes');
      const modalBtnContainer = document.getElementById('modal-btn-container');
      const modalStock = document.getElementById('modal-stock');

      modalMainImg.src = p.poze[0] || '';
      modalName.textContent = p.nume;
      modalDesc.textContent = p.descriere;
      modalPrice.textContent = p.stoc === 0 ? '' : `${p.pret} RON`;
      modalSizes.innerHTML = p.marimi.map(m => `<span class="size">${m}</span>`).join('');
      modalBtnContainer.innerHTML = p.stoc > 0 ? `<button class="btn add-modal-cart">Comandă!</button>` : `<span class="btn disabled">Indisponibil</span>`;
      modalStock.textContent = p.stoc === 0 ? 'Indisponibil' : `Stoc: ${p.stoc}`;

      modalThumbs.innerHTML = '';
      p.poze.forEach((imgSrc, i) => {
        const thumb = document.createElement('img');
        thumb.src = imgSrc;
        thumb.style.width = '70px';
        thumb.style.cursor = 'pointer';
        thumb.style.borderRadius = '6px';
        if (i === 0) thumb.classList.add('active');
        thumb.addEventListener('click', () => { modalMainImg.src = imgSrc; modalThumbs.querySelectorAll('img').forEach(t => t.classList.remove('active')); thumb.classList.add('active'); });
        modalThumbs.appendChild(thumb);
      });

        // attach size selectors inside modal
        const modalSizeSpans = modalSizes.querySelectorAll('.size');
        modalSizeSpans.forEach(span => {
          span.addEventListener('click', () => {
            modalSizeSpans.forEach(s => s.classList.remove('active'));
            span.classList.add('active');
          });
        });

        // attach add-to-cart handler for modal button
        const modalAddBtn = modalBtnContainer.querySelector('.add-modal-cart');
        if (modalAddBtn) {
          modalAddBtn.addEventListener('click', (e) => {
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

      modal.style.display = 'flex';
    }

    // Autoplay + pointer drag + inertia
    let rafId = null;
    let autoInterval = null;
    const itemWidth = () => (track.querySelector('.carousel-item') || {}).getBoundingClientRect().width || 220;
    const gap = () => parseInt(window.getComputedStyle(track).gap) || 10;

    function startAuto() { stopAuto(); autoInterval = setInterval(() => { track.scrollBy({ left: Math.round(itemWidth() + gap()), behavior: 'smooth' }); }, 3000); }
    function stopAuto() { if (autoInterval) { clearInterval(autoInterval); autoInterval = null; } }

    // pointer drag
    let pointer = { down:false, startX:0, scrollLeft:0, lastX:0, lastT:0, vx:0 };
    track.addEventListener('pointerdown', (e) => {
      pointer.down = true; track.setPointerCapture(e.pointerId);
      pointer.startX = e.clientX; pointer.scrollLeft = track.scrollLeft; pointer.lastX = e.clientX; pointer.lastT = performance.now(); pointer.vx = 0; stopAuto();
    });
    track.addEventListener('pointermove', (e) => {
      if (!pointer.down) return;
      const dx = e.clientX - pointer.startX;
      track.scrollLeft = pointer.scrollLeft - dx;
      const now = performance.now();
      pointer.vx = (e.clientX - pointer.lastX) / (now - pointer.lastT || 16);
      pointer.lastX = e.clientX; pointer.lastT = now;
    });
    track.addEventListener('pointerup', (e) => {
      pointer.down = false; track.releasePointerCapture(e.pointerId);
      // inertia
      let v = pointer.vx * 1000; // px/s
      const decay = 0.95;
      function step() {
        if (Math.abs(v) < 10) { cancelAnim(); startAuto(); return; }
        track.scrollLeft -= v * (1/60);
        v *= decay;
        rafId = requestAnimationFrame(step);
      }
      function cancelAnim(){ if(rafId){ cancelAnimationFrame(rafId); rafId = null; } }
      step();
    });
    track.addEventListener('pointercancel', () => { pointer.down = false; startAuto(); });

    // arrows
    const prev = container.querySelector('.carousel-prev');
    const next = container.querySelector('.carousel-next');
    if (next) next.addEventListener('click', () => { track.scrollBy({ left: Math.round(itemWidth() + gap()), behavior: 'smooth' }); startAuto(); });
    if (prev) prev.addEventListener('click', () => { track.scrollBy({ left: -Math.round(itemWidth() + gap()), behavior: 'smooth' }); startAuto(); });

    // pause on hover/touch
    track.addEventListener('mouseenter', stopAuto); track.addEventListener('mouseleave', startAuto);
    // also pause the floaty animation to avoid transform conflicts and flicker
    track.addEventListener('pointerenter', () => {
      Array.from(track.querySelectorAll('.carousel-item.lux')).forEach(it => { it.style.animationPlayState = 'paused'; });
    });
    track.addEventListener('pointerleave', () => {
      Array.from(track.querySelectorAll('.carousel-item.lux')).forEach(it => { it.style.animationPlayState = 'running'; });
    });
    track.addEventListener('touchstart', stopAuto, { passive:true }); track.addEventListener('touchend', startAuto, { passive:true });

    // loop handling: when near end, jump back seamlessly
    track.addEventListener('scroll', () => {
      const max = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= max - 2) {
        // jump to start (first set)
        track.scrollLeft = 0;
      }
    });

    // start autoplay after a short delay so initial alignment sticks
    // also reinforce scrollLeft = 0 a couple of times to counter any racing intervals
    try { track.scrollLeft = 0; track.scrollTo({ left: 0 }); } catch(e){}
    setTimeout(()=>{ try{ track.scrollLeft = 0; track.scrollTo({ left: 0 }); }catch(e){} }, 120);
    setTimeout(()=>{ try{ track.scrollLeft = 0; track.scrollTo({ left: 0 }); }catch(e){} }, 420);
    setTimeout(() => startAuto(), 700);
  }

  function buildProductCarousel(produse) {
    const container = document.getElementById('product-carousel');
    if (!container) return;

    const track = container.querySelector('.carousel-track');
    const prev = container.querySelector('.carousel-prev');
    const next = container.querySelector('.carousel-next');
    if (!track) return;

    if (typeof container._carouselCleanup === 'function') {
      container._carouselCleanup();
    }

    const source = (produse || []).filter(p => p && p.nume).slice(0, 12);
    track.innerHTML = '';

    if (!source.length) {
      container.classList.add('is-empty');
      if (prev) prev.hidden = true;
      if (next) next.hidden = true;
      return;
    }

    container.classList.remove('is-empty');
    if (prev) prev.hidden = source.length <= 1;
    if (next) next.hidden = source.length <= 1;

    const controller = new AbortController();
    const signal = controller.signal;
    const repeatedProducts = source.length > 1 ? [...source, ...source, ...source] : source;

    const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));

    const fallbackImage = () => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='700'><rect width='100%' height='100%' fill='%23070a0a'/><text x='50%' y='50%' fill='%23ffffff' font-family='Arial,Helvetica,sans-serif' font-size='30' dominant-baseline='middle' text-anchor='middle'>Imagine indisponibila</text></svg>`;
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    };

    repeatedProducts.forEach((p, index) => {
      const item = document.createElement('article');
      item.className = 'carousel-item lux';
      item.dataset.productIndex = String(index % source.length);
      item.setAttribute('role', 'listitem');

      const sizesHTML = (p.marimi || []).slice(0, 5)
        .map(m => `<button type="button" class="size" data-size="${escapeHTML(m)}">${escapeHTML(m)}</button>`)
        .join('');
      const stock = Number(p.stoc) || 0;
      const image = (p.poze || [])[0] || '';

      item.innerHTML = `
        <div class="card-plate">
          <div class="badges">
            <span class="badge new-drop">NEW DROP</span>
            ${stock > 0 && stock < 6 ? '<span class="badge limited">LIMITED</span>' : ''}
            ${stock <= 0 ? '<span class="badge sold-out">SOLD OUT</span>' : ''}
          </div>
          <button type="button" class="img-wrap" data-action="open" aria-label="Deschide ${escapeHTML(p.nume)}">
            <img src="${escapeHTML(image)}" alt="${escapeHTML(p.nume)}" loading="lazy">
            <span class="ambient-glow"></span>
          </button>
          <div class="meta">
            <button type="button" class="title" data-action="open">${escapeHTML(p.nume)}</button>
            <div class="price">${formatPrice(p.pret)}</div>
            ${sizesHTML ? `<div class="sizes-row" aria-label="Marimi disponibile">${sizesHTML}</div>` : ''}
            <button type="button" class="add-to-cart" ${stock <= 0 ? 'disabled' : ''}>
              ${stock <= 0 ? 'Indisponibil' : 'Adauga in cos'}
            </button>
          </div>
        </div>
      `;

      const imgEl = item.querySelector('img');
      if (imgEl) {
        imgEl.onerror = function() {
          this.onerror = null;
          this.src = fallbackImage();
          this.style.objectFit = 'contain';
        };
      }

      track.appendChild(item);
    });

    function itemOpenModal(p) {
      const modal = document.getElementById('product-modal');
      const modalThumbs = document.getElementById('modal-thumbs');
      const modalMainImg = document.getElementById('modal-main-img');
      const modalName = document.getElementById('modal-name');
      const modalDesc = document.getElementById('modal-desc');
      const modalPrice = document.getElementById('modal-price');
      const modalSizes = document.getElementById('modal-sizes');
      const modalBtnContainer = document.getElementById('modal-btn-container');
      const modalStock = document.getElementById('modal-stock');
      if (!modal || !modalThumbs || !modalMainImg || !modalName || !modalDesc || !modalPrice || !modalSizes || !modalBtnContainer || !modalStock) return;

      modalMainImg.src = (p.poze || [])[0] || '';
      modalName.textContent = p.nume;
      modalDesc.textContent = p.descriere;
      modalPrice.textContent = Number(p.stoc) === 0 ? '' : formatPrice(p.pret);
      modalSizes.innerHTML = (p.marimi || []).map(m => `<span class="size">${escapeHTML(m)}</span>`).join('');
      modalBtnContainer.innerHTML = Number(p.stoc) > 0 ? `<button class="btn add-modal-cart">Comanda!</button>` : `<span class="btn disabled">Indisponibil</span>`;
      modalStock.textContent = Number(p.stoc) === 0 ? 'Indisponibil' : `Stoc: ${p.stoc}`;

      modalThumbs.innerHTML = '';
      (p.poze || []).forEach((imgSrc, i) => {
        const thumb = document.createElement('img');
        thumb.src = imgSrc;
        thumb.style.width = '70px';
        thumb.style.cursor = 'pointer';
        thumb.style.borderRadius = '6px';
        if (i === 0) thumb.classList.add('active');
        thumb.addEventListener('click', () => {
          modalMainImg.src = imgSrc;
          modalThumbs.querySelectorAll('img').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
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

      const modalAddBtn = modalBtnContainer.querySelector('.add-modal-cart');
      if (modalAddBtn) {
        modalAddBtn.addEventListener('click', (e) => {
          const sizeRequired = p.marimi && p.marimi.length > 0;
          const selectedEl = modalSizes.querySelector('.size.active');
          if (sizeRequired && !selectedEl) {
            showNotification('Selecteaza o marime inainte de a adauga in cos', 'error');
            return;
          }

          const marimeSelectata = selectedEl ? selectedEl.textContent : 'Nespecificat';
          const existIdx = cos.findIndex(it => it.id === p.id && it.marime === marimeSelectata);
          if (existIdx > -1) {
            cos[existIdx].qty = (Number(cos[existIdx].qty) || 0) + 1;
          } else {
            cos.push({ id: p.id, nume: p.nume, marime: marimeSelectata, pret: p.pret, qty: 1, thumb: (p.poze || [])[0] || '' });
          }
          actualizeazaCos();
          showNotification('Produs adaugat in cos', 'success');

          const btn = e.currentTarget;
          btn.classList.add('added');
          setTimeout(() => btn.classList.remove('added'), 800);
        });
      }

      modal.style.display = 'flex';
    }

    let rafId = null;
    let autoInterval = null;
    let snapAfterScroll = null;
    let isDragging = false;
    const itemWidth = () => (track.querySelector('.carousel-item') || {}).getBoundingClientRect().width || 260;
    const gap = () => parseInt(window.getComputedStyle(track).gap) || 10;
    const setWidth = () => source.length > 1 ? track.scrollWidth / 3 : track.scrollWidth;
    const scrollStep = () => Math.round(itemWidth() + gap());

    function alignToMiddleSet() {
      if (source.length <= 1) {
        track.scrollLeft = 0;
        return;
      }
      const middleCard = track.children[source.length];
      if (!middleCard) {
        track.scrollLeft = 0;
        return;
      }
      const cardWidth = middleCard.getBoundingClientRect().width;
      const trackPaddingLeft = parseInt(window.getComputedStyle(track).paddingLeft || 0);
      const shouldLeftAlign = track.clientWidth <= cardWidth * 2.2;
      track.scrollLeft = shouldLeftAlign
        ? Math.max(0, middleCard.offsetLeft - trackPaddingLeft)
        : Math.max(0, middleCard.offsetLeft - ((track.clientWidth - cardWidth) / 2));
    }

    function normalizeLoop() {
      if (source.length <= 1) return;
      const width = setWidth();
      if (!width) return;
      if (track.scrollLeft < width * 0.5) {
        track.scrollLeft += width;
      } else if (track.scrollLeft > width * 1.5) {
        track.scrollLeft -= width;
      }
    }

    function startAuto() {
      stopAuto();
      if (source.length <= 1) return;
      autoInterval = setInterval(() => {
        normalizeLoop();
        track.scrollBy({ left: scrollStep(), behavior: 'smooth' });
      }, 3200);
    }

    function stopAuto() {
      if (autoInterval) {
        clearInterval(autoInterval);
        autoInterval = null;
      }
    }

    let pointer = { down:false, startX:0, scrollLeft:0, lastX:0, lastT:0, vx:0, type:'mouse' };

    function finishDrag(pointerId) {
      if (!pointer.down) return;
      pointer.down = false;
      try {
        if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
      } catch(e) {}

      let v = pointer.vx * 1000;
      const isTouchLike = pointer.type === 'touch' || pointer.type === 'pen';
      if (isTouchLike) v *= 1.65;
      const decay = isTouchLike ? 0.94 : 0.92;
      const step = () => {
        if (Math.abs(v) < 12) {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = null;
          normalizeLoop();
          startAuto();
          return;
        }
        track.scrollLeft -= v / 60;
        normalizeLoop();
        v *= decay;
        rafId = requestAnimationFrame(step);
      };
      step();
    }

    track.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      pointer.down = true;
      pointer.type = e.pointerType || 'mouse';
      isDragging = false;
      if (rafId) cancelAnimationFrame(rafId);
      track.setPointerCapture(e.pointerId);
      pointer.startX = e.clientX;
      pointer.scrollLeft = track.scrollLeft;
      pointer.lastX = e.clientX;
      pointer.lastT = performance.now();
      pointer.vx = 0;
      stopAuto();
    }, { signal });

    track.addEventListener('pointermove', (e) => {
      if (!pointer.down) return;
      const dx = e.clientX - pointer.startX;
      if (Math.abs(dx) > 6) isDragging = true;
      track.scrollLeft = pointer.scrollLeft - dx;
      const now = performance.now();
      pointer.vx = (e.clientX - pointer.lastX) / (now - pointer.lastT || 16);
      pointer.lastX = e.clientX;
      pointer.lastT = now;
      normalizeLoop();
    }, { signal });

    track.addEventListener('pointerup', (e) => finishDrag(e.pointerId), { signal });
    track.addEventListener('pointercancel', (e) => finishDrag(e.pointerId), { signal });

    track.addEventListener('click', (e) => {
      if (isDragging) {
        e.preventDefault();
        isDragging = false;
        return;
      }

      const item = e.target.closest('.carousel-item');
      if (!item) return;
      const product = source[Number(item.dataset.productIndex)];
      if (!product) return;

      const sizeBtn = e.target.closest('.sizes-row .size');
      if (sizeBtn) {
        item.querySelectorAll('.sizes-row .size').forEach(btn => btn.classList.remove('active'));
        sizeBtn.classList.add('active');
        return;
      }

      const addBtn = e.target.closest('.add-to-cart');
      if (addBtn) {
        const sizeRequired = product.marimi && product.marimi.length > 0;
        const selectedEl = item.querySelector('.sizes-row .size.active');
        if (sizeRequired && !selectedEl) {
          showNotification('Selecteaza o marime inainte de a adauga in cos', 'error');
          return;
        }

        const marimeSelectata = selectedEl ? selectedEl.textContent : 'Nespecificat';
        const existIdx = cos.findIndex(it => it.id === product.id && it.marime === marimeSelectata);
        if (existIdx > -1) {
          cos[existIdx].qty = (Number(cos[existIdx].qty) || 0) + 1;
        } else {
          cos.push({ id: product.id, nume: product.nume, marime: marimeSelectata, pret: product.pret, qty: 1, thumb: (product.poze || [])[0] || '' });
        }
        actualizeazaCos();
        addBtn.classList.add('added');
        setTimeout(() => addBtn.classList.remove('added'), 800);
        showNotification('Produs adaugat in cos', 'success');
        return;
      }

      if (e.target.closest('[data-action="open"]')) {
        itemOpenModal(product);
      }
    }, { signal });

    if (next) next.addEventListener('click', () => {
      normalizeLoop();
      track.scrollBy({ left: scrollStep(), behavior: 'smooth' });
      startAuto();
    }, { signal });

    if (prev) prev.addEventListener('click', () => {
      normalizeLoop();
      track.scrollBy({ left: -scrollStep(), behavior: 'smooth' });
      startAuto();
    }, { signal });

    track.addEventListener('mouseenter', stopAuto, { signal });
    track.addEventListener('mouseleave', startAuto, { signal });
    track.addEventListener('touchstart', stopAuto, { passive:true, signal });
    track.addEventListener('touchend', startAuto, { passive:true, signal });
    track.addEventListener('scroll', () => {
      if (snapAfterScroll) clearTimeout(snapAfterScroll);
      snapAfterScroll = setTimeout(normalizeLoop, 80);
    }, { passive:true, signal });

    window.addEventListener('resize', alignToMiddleSet, { signal });

    container._carouselCleanup = () => {
      stopAuto();
      if (rafId) cancelAnimationFrame(rafId);
      if (snapAfterScroll) clearTimeout(snapAfterScroll);
      controller.abort();
    };

    requestAnimationFrame(() => {
      alignToMiddleSet();
      setTimeout(alignToMiddleSet, 120);
      setTimeout(startAuto, 700);
    });
  }

  function buildProductCarousel(produse) {
    const container = document.getElementById('product-carousel');
    if (!container) return;

    const track = container.querySelector('.carousel-track');
    const prev = container.querySelector('.carousel-prev');
    const next = container.querySelector('.carousel-next');
    if (!track) return;

    if (typeof container._carouselCleanup === 'function') {
      container._carouselCleanup();
    }

    const products = (produse || []).filter(p => p && p.nume);
    track.innerHTML = '';

    const oldTabs = container.querySelector('.carousel-category-switch');
    if (oldTabs) oldTabs.remove();

    if (!products.length) {
      container.classList.add('is-empty');
      if (prev) prev.hidden = true;
      if (next) next.hidden = true;
      return;
    }

    container.classList.remove('is-empty');

    const controller = new AbortController();
    const signal = controller.signal;
    const favoriteIds = container._favoriteIds || new Set();
    container._favoriteIds = favoriteIds;

    const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));

    const normalizeTag = (value = '') => String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const fallbackImage = () => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='700'><rect width='100%' height='100%' fill='%23070a0a'/><text x='50%' y='50%' fill='%23ffffff' font-family='Arial,Helvetica,sans-serif' font-size='30' dominant-baseline='middle' text-anchor='middle'>Imagine indisponibila</text></svg>`;
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    };

    const categoryMap = new Map();
    products.forEach(product => {
      (product.etichete || []).forEach(tag => {
        const label = String(tag || '').trim();
        const key = normalizeTag(label);
        if (!key) return;
        if (!categoryMap.has(key)) categoryMap.set(key, { key, label, count: 0 });
        categoryMap.get(key).count += 1;
      });
    });

    let categories = Array.from(categoryMap.values()).sort((a, b) => a.label.localeCompare(b.label));
    if (!categories.length) {
      categories = [{ key: 'toate', label: 'Toate', count: products.length }];
    }

    const defaultCategory = categories.find(cat => cat.key === 'adidasi' || cat.key.includes('adidas')) || categories[0];
    let selectedCategory = defaultCategory.key;
    let currentSource = [];
    let rafId = null;
    let autoInterval = null;
    let snapAfterScroll = null;
    let isDragging = false;
    let pointer = { down:false, startX:0, scrollLeft:0, lastX:0, lastT:0, vx:0 };

    const switcher = document.createElement('div');
    switcher.className = 'carousel-category-switch';
    switcher.setAttribute('aria-label', 'Categorii carusel');
    categories.forEach(cat => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'carousel-category-btn';
      button.dataset.category = cat.key;
      button.setAttribute('aria-pressed', cat.key === selectedCategory ? 'true' : 'false');
      button.innerHTML = `<span>${escapeHTML(cat.label)}</span><span>${cat.count}</span>`;
      switcher.appendChild(button);
    });
    container.insertBefore(switcher, track);

    function getProductId(product, index) {
      return product.id || `${product.nume}-${index}`;
    }

    function filterProducts() {
      if (selectedCategory === 'toate') return products;
      const filtered = products.filter(product => (product.etichete || []).some(tag => normalizeTag(tag) === selectedCategory));
      return filtered.length ? filtered : products;
    }

    function stopAuto() {
      if (autoInterval) {
        clearInterval(autoInterval);
        autoInterval = null;
      }
    }

    function itemWidth() {
      return (track.querySelector('.carousel-item') || {}).getBoundingClientRect().width || 240;
    }

    function gap() {
      return parseInt(window.getComputedStyle(track).gap) || 10;
    }

    function setWidth() {
      return currentSource.length > 1 ? track.scrollWidth / 3 : track.scrollWidth;
    }

    function scrollStep() {
      return Math.round(itemWidth() + gap());
    }

    function alignToMiddleSet() {
      if (currentSource.length <= 1) {
        track.scrollLeft = 0;
        return;
      }
      const middleCard = track.children[currentSource.length];
      if (!middleCard) {
        track.scrollLeft = 0;
        return;
      }
      const cardWidth = middleCard.getBoundingClientRect().width;
      const trackPaddingLeft = parseInt(window.getComputedStyle(track).paddingLeft || 0);
      const shouldLeftAlign = track.clientWidth <= cardWidth * 2.2;
      track.scrollLeft = shouldLeftAlign
        ? Math.max(0, middleCard.offsetLeft - trackPaddingLeft)
        : Math.max(0, middleCard.offsetLeft - ((track.clientWidth - cardWidth) / 2));
    }

    function normalizeLoop() {
      if (currentSource.length <= 1) return;
      const width = setWidth();
      if (!width) return;
      if (track.scrollLeft < width * 0.5) {
        track.scrollLeft += width;
      } else if (track.scrollLeft > width * 1.5) {
        track.scrollLeft -= width;
      }
    }

    function startAuto() {
      stopAuto();
      if (currentSource.length <= 1) return;
      autoInterval = setInterval(() => {
        normalizeLoop();
        track.scrollBy({ left: scrollStep(), behavior: 'smooth' });
      }, 3200);
    }

    function renderCards() {
      stopAuto();
      if (rafId) cancelAnimationFrame(rafId);
      if (snapAfterScroll) clearTimeout(snapAfterScroll);

      currentSource = filterProducts().slice(0, 12);
      const repeatedProducts = currentSource.length > 1 ? [...currentSource, ...currentSource, ...currentSource] : currentSource;
      track.innerHTML = '';

      if (prev) prev.hidden = currentSource.length <= 1;
      if (next) next.hidden = currentSource.length <= 1;

      repeatedProducts.forEach((product, index) => {
        const originalIndex = index % currentSource.length;
        const productId = getProductId(product, originalIndex);
        const isFavorite = favoriteIds.has(productId);
        const image = (product.poze || [])[0] || '';
        const item = document.createElement('article');
        item.className = 'carousel-item lux carousel-product-card';
        item.dataset.productIndex = String(originalIndex);
        item.dataset.productId = productId;
        item.setAttribute('role', 'listitem');
        item.innerHTML = `
          <button type="button" class="favorite-btn${isFavorite ? ' active' : ''}" aria-label="Adauga la favorite" aria-pressed="${isFavorite ? 'true' : 'false'}">&hearts;</button>
          <button type="button" class="carousel-card-open" data-action="open" aria-label="Deschide ${escapeHTML(product.nume)}">
            <span class="img-wrap">
              <img src="${escapeHTML(image)}" alt="${escapeHTML(product.nume)}" loading="lazy">
              <span class="ambient-glow"></span>
            </span>
            <span class="carousel-card-title">${escapeHTML(product.nume)}</span>
          </button>
        `;

        const imgEl = item.querySelector('img');
        if (imgEl) {
          imgEl.onerror = function() {
            this.onerror = null;
            this.src = fallbackImage();
            this.style.objectFit = 'contain';
          };
        }

        const favoriteBtn = item.querySelector('.favorite-btn');
        const openBtn = item.querySelector('.carousel-card-open');

        if (favoriteBtn) {
          favoriteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const active = !favoriteIds.has(productId);
            if (active) favoriteIds.add(productId); else favoriteIds.delete(productId);
            track.querySelectorAll('.carousel-item').forEach(card => {
              if (card.dataset.productId !== productId) return;
              const btn = card.querySelector('.favorite-btn');
              if (!btn) return;
              btn.classList.toggle('active', active);
              btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
          });
        }

        if (openBtn) {
          openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isDragging) {
              isDragging = false;
              return;
            }
            itemOpenModal(product);
          });
        }

        track.appendChild(item);
      });

      requestAnimationFrame(() => {
        alignToMiddleSet();
        setTimeout(alignToMiddleSet, 120);
        setTimeout(startAuto, 700);
      });
    }

    function itemOpenModal(product) {
      const modal = document.getElementById('product-modal');
      const modalThumbs = document.getElementById('modal-thumbs');
      const modalMainImg = document.getElementById('modal-main-img');
      const modalName = document.getElementById('modal-name');
      const modalDesc = document.getElementById('modal-desc');
      const modalPrice = document.getElementById('modal-price');
      const modalSizes = document.getElementById('modal-sizes');
      const modalBtnContainer = document.getElementById('modal-btn-container');
      const modalStock = document.getElementById('modal-stock');
      if (!modal || !modalThumbs || !modalMainImg || !modalName || !modalDesc || !modalPrice || !modalSizes || !modalBtnContainer || !modalStock) return;

      modalMainImg.src = (product.poze || [])[0] || '';
      modalName.textContent = product.nume;
      modalDesc.textContent = product.descriere;
      modalPrice.textContent = Number(product.stoc) === 0 ? '' : formatPrice(product.pret);
      modalSizes.innerHTML = (product.marimi || []).map(m => `<span class="size">${escapeHTML(m)}</span>`).join('');
      modalBtnContainer.innerHTML = Number(product.stoc) > 0 ? `<button class="btn add-modal-cart">Comanda!</button>` : `<span class="btn disabled">Indisponibil</span>`;
      modalStock.textContent = Number(product.stoc) === 0 ? 'Indisponibil' : `Stoc: ${product.stoc}`;

      modalThumbs.innerHTML = '';
      (product.poze || []).forEach((imgSrc, i) => {
        const thumb = document.createElement('img');
        thumb.src = imgSrc;
        thumb.style.width = '70px';
        thumb.style.cursor = 'pointer';
        thumb.style.borderRadius = '6px';
        if (i === 0) thumb.classList.add('active');
        thumb.addEventListener('click', () => {
          modalMainImg.src = imgSrc;
          modalThumbs.querySelectorAll('img').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
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

      const modalAddBtn = modalBtnContainer.querySelector('.add-modal-cart');
      if (modalAddBtn) {
        modalAddBtn.addEventListener('click', (e) => {
          const sizeRequired = product.marimi && product.marimi.length > 0;
          const selectedEl = modalSizes.querySelector('.size.active');
          if (sizeRequired && !selectedEl) {
            showNotification('Selecteaza o marime inainte de a adauga in cos', 'error');
            return;
          }

          const marimeSelectata = selectedEl ? selectedEl.textContent : 'Nespecificat';
          const existIdx = cos.findIndex(it => it.id === product.id && it.marime === marimeSelectata);
          if (existIdx > -1) {
            cos[existIdx].qty = (Number(cos[existIdx].qty) || 0) + 1;
          } else {
            cos.push({ id: product.id, nume: product.nume, marime: marimeSelectata, pret: product.pret, qty: 1, thumb: (product.poze || [])[0] || '' });
          }
          actualizeazaCos();
          showNotification('Produs adaugat in cos', 'success');

          const btn = e.currentTarget;
          btn.classList.add('added');
          setTimeout(() => btn.classList.remove('added'), 800);
        });
      }

      modal.style.display = 'flex';
    }

    function finishDrag(pointerId) {
      if (!pointer.down) return;
      pointer.down = false;
      try {
        if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
      } catch(e) {}

      let v = pointer.vx * 1000;
      const decay = 0.92;
      const step = () => {
        if (Math.abs(v) < 12) {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = null;
          normalizeLoop();
          startAuto();
          return;
        }
        track.scrollLeft -= v / 60;
        normalizeLoop();
        v *= decay;
        rafId = requestAnimationFrame(step);
      };
      step();
    }

    switcher.addEventListener('click', (e) => {
      const button = e.target.closest('.carousel-category-btn');
      if (!button) return;
      selectedCategory = button.dataset.category;
      switcher.querySelectorAll('.carousel-category-btn').forEach(btn => {
        const active = btn === button;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      renderCards();
    }, { signal });

    track.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      pointer.down = true;
      isDragging = false;
      if (rafId) cancelAnimationFrame(rafId);
      track.setPointerCapture(e.pointerId);
      pointer.startX = e.clientX;
      pointer.scrollLeft = track.scrollLeft;
      pointer.lastX = e.clientX;
      pointer.lastT = performance.now();
      pointer.vx = 0;
      stopAuto();
    }, { signal });

    track.addEventListener('pointermove', (e) => {
      if (!pointer.down) return;
      const dx = e.clientX - pointer.startX;
      if (Math.abs(dx) > 6) isDragging = true;
      track.scrollLeft = pointer.scrollLeft - dx;
      const now = performance.now();
      pointer.vx = (e.clientX - pointer.lastX) / (now - pointer.lastT || 16);
      pointer.lastX = e.clientX;
      pointer.lastT = now;
      normalizeLoop();
    }, { signal });

    track.addEventListener('pointerup', (e) => finishDrag(e.pointerId), { signal });
    track.addEventListener('pointercancel', (e) => finishDrag(e.pointerId), { signal });

    track.addEventListener('click', (e) => {
      if (isDragging) {
        e.preventDefault();
        isDragging = false;
        return;
      }

      const item = e.target.closest('.carousel-item');
      if (!item) return;
      const product = currentSource[Number(item.dataset.productIndex)];
      if (!product) return;

      const fav = e.target.closest('.favorite-btn');
      if (fav) {
        const productId = item.dataset.productId;
        const active = !favoriteIds.has(productId);
        if (active) favoriteIds.add(productId); else favoriteIds.delete(productId);
        track.querySelectorAll('.carousel-item').forEach(card => {
          if (card.dataset.productId !== productId) return;
          const btn = card.querySelector('.favorite-btn');
          if (!btn) return;
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        return;
      }

      itemOpenModal(product);
    }, { signal });

    if (next) next.addEventListener('click', () => {
      normalizeLoop();
      track.scrollBy({ left: scrollStep(), behavior: 'smooth' });
      startAuto();
    }, { signal });

    if (prev) prev.addEventListener('click', () => {
      normalizeLoop();
      track.scrollBy({ left: -scrollStep(), behavior: 'smooth' });
      startAuto();
    }, { signal });

    track.addEventListener('mouseenter', stopAuto, { signal });
    track.addEventListener('mouseleave', startAuto, { signal });
    track.addEventListener('touchstart', stopAuto, { passive:true, signal });
    track.addEventListener('touchend', startAuto, { passive:true, signal });
    track.addEventListener('scroll', () => {
      if (snapAfterScroll) clearTimeout(snapAfterScroll);
      snapAfterScroll = setTimeout(normalizeLoop, 80);
    }, { passive:true, signal });

    window.addEventListener('resize', alignToMiddleSet, { signal });

    container._carouselCleanup = () => {
      stopAuto();
      if (rafId) cancelAnimationFrame(rafId);
      if (snapAfterScroll) clearTimeout(snapAfterScroll);
      controller.abort();
    };

    switcher.querySelectorAll('.carousel-category-btn').forEach(btn => {
      const active = btn.dataset.category === selectedCategory;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    renderCards();
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

  // --- Simple, robust carousel builder (fallback visible if CSV is empty) ---
  function buildSimpleCarousel(produse) {
    const container = document.getElementById('product-carousel');
    if (!container) return;
    const track = container.querySelector('.carousel-track');
    const prev = container.querySelector('.carousel-prev');
    const next = container.querySelector('.carousel-next');
    if (!track) return;
    track.innerHTML = '';

    const fallbackSVG = (label = 'Imagine') => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='%23060b0b'/><text x='50%' y='50%' fill='%23ffffff' font-family='Inter, Arial' font-size='28' dominant-baseline='middle' text-anchor='middle'>${label}</text></svg>`;
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    };

    const source = (produse && produse.length) ? produse.slice(0,12) : [
      { id: 's1', nume: 'DROP Sneaker', descriere: 'Model demo', pret: 199, stoc: 5, marimi: ['38','39','40'], poze: [fallbackSVG('DROP Sneaker')] },
      { id: 's2', nume: 'MOMO Runner', descriere: 'Model demo', pret: 229, stoc: 3, marimi: ['39','40','41'], poze: [fallbackSVG('MOMO Runner')] },
      { id: 's3', nume: 'Urban High', descriere: 'Model demo', pret: 249, stoc: 2, marimi: ['40','41','42'], poze: [fallbackSVG('Urban High')] }
    ];

    source.forEach((p, idx) => {
      const item = document.createElement('article');
      item.className = 'carousel-item lux carousel-product-card';
      item.dataset.index = String(idx);
      item.innerHTML = `
        <button type="button" class="favorite-btn" aria-label="Adauga la favorite">&hearts;</button>
        <button type="button" class="carousel-card-open" data-action="open" aria-label="Deschide ${p.nume}">
          <span class="img-wrap"><img src="${p.poze && p.poze[0] ? p.poze[0] : fallbackSVG(p.nume)}" alt="${p.nume}"></span>
          <span class="carousel-card-title">${p.nume}</span>
        </button>
      `;

      const img = item.querySelector('img');
      if (img) img.onerror = function(){ this.onerror=null; this.src = fallbackSVG(p.nume); };

      // click open -> populate modal
      item.querySelector('.carousel-card-open').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const modal = document.getElementById('product-modal');
        if (!modal) return;
        const modalThumbs = document.getElementById('modal-thumbs');
        const modalMainImg = document.getElementById('modal-main-img');
        const modalName = document.getElementById('modal-name');
        const modalDesc = document.getElementById('modal-desc');
        const modalPrice = document.getElementById('modal-price');
        const modalSizes = document.getElementById('modal-sizes');
        const modalBtnContainer = document.getElementById('modal-btn-container');
        const modalStock = document.getElementById('modal-stock');

        modalMainImg.src = (p.poze || [])[0] || fallbackSVG(p.nume);
        modalName.textContent = p.nume;
        modalDesc.textContent = p.descriere || '';
        modalPrice.textContent = p.stoc === 0 ? '' : (p.pret ? p.pret + ' RON' : '—');
        modalSizes.innerHTML = (p.marimi || []).map(m => `<span class="size">${m}</span>`).join('');
        modalBtnContainer.innerHTML = p.stoc > 0 ? `<button class="btn add-modal-cart">Comandă!</button>` : `<span class="btn disabled">Indisponibil</span>`;
        modalStock.textContent = p.stoc === 0 ? 'Indisponibil' : `Stoc: ${p.stoc}`;

        modalThumbs.innerHTML = '';
        (p.poze || [modalMainImg.src]).forEach((src, i) => {
          const t = document.createElement('img'); t.src = src; t.style.width = '70px'; t.style.cursor = 'pointer'; t.style.borderRadius = '6px';
          if (i===0) t.classList.add('active');
          t.addEventListener('click', ()=>{ modalMainImg.src = src; modalThumbs.querySelectorAll('img').forEach(x=>x.classList.remove('active')); t.classList.add('active'); });
          modalThumbs.appendChild(t);
        });

        modal.style.display = 'flex';
      });

      // favorite toggle
      const fav = item.querySelector('.favorite-btn');
      fav.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fav.classList.toggle('active'); fav.setAttribute('aria-pressed', fav.classList.contains('active') ? 'true' : 'false'); });

      track.appendChild(item);
    });

    // basic arrow behavior
    if (next) next.addEventListener('click', ()=>{ track.scrollBy({ left: 260, behavior: 'smooth' }); });
    if (prev) prev.addEventListener('click', ()=>{ track.scrollBy({ left: -260, behavior: 'smooth' }); });
  }

  // Ensure CTA buttons reflect chosen dark theme immediately (runtime override)
  function applyDarkCtaStyles() {
    const bg = 'linear-gradient(90deg, #022d1d 0%, #04462a 50%, #076537 100%)';
    const hoverBg = 'linear-gradient(90deg, #04462a 0%, #065034 50%, #04462a 100%)';
    const text = '#bfffe6';
    document.querySelectorAll('.btn, .add-to-cart, .modal-action-row .btn').forEach(b => {
      try {
        b.style.background = bg;
        b.style.color = text;
        b.style.borderColor = 'rgba(0,60,34,0.12)';
      } catch(e) {}
    });
    // add a tiny hover listener to ensure hover color feels correct in older browsers
    document.querySelectorAll('.btn, .add-to-cart').forEach(b => {
      b.addEventListener('mouseenter', () => { b.style.filter = 'brightness(1.02)'; });
      b.addEventListener('mouseleave', () => { b.style.filter = ''; });
    });
  }

  // apply immediately after DOM ready
  try { applyDarkCtaStyles(); } catch(e) { /* ignore */ }

});
