(() => {
  const get = id => document.getElementById(id);
  const weatherNames = {rain:'雨', thunderstorm:'雷雨', sunny:'晴れ', 'partly-cloudy':'晴れと曇り'};
  let cards;
  function renderGallery() {
    const query = get('gallerySearch').value.trim();
    const category = get('galleryCategory').value;
    const matches = cards.filter(card => card.name.includes(query) && (!category || card.category === category));
    get('galleryGrid').replaceChildren(...matches.map(card => {
      const button = document.createElement('button');
      button.className = 'gallery-card';
      const image = document.createElement('img');
      image.src = card.image;
      image.alt = card.name;
      image.loading = 'lazy';
      const caption = document.createElement('span');
      caption.textContent = card.name + (card.level ? ' Lv.' + card.level : '') + (card.weather ? ' · ' + (weatherNames[card.weather] || card.weather) : '');
      button.append(image, caption);
      button.onclick = () => {
        get('cardPreviewTitle').textContent = caption.textContent;
        get('cardPreviewImage').src = card.image;
        get('cardPreviewImage').alt = caption.textContent;
        get('cardPreviewDialog').showModal();
      };
      return button;
    }));
    get('galleryCount').textContent = matches.length + '種類';
  }
  get('galleryOpen').onclick = async () => {
    get('galleryDialog').showModal();
    if (!cards) {
      get('galleryCount').textContent = '読み込み中…';
      try {
        const response = await fetch('/rocket-gallery.json?v=20261113-weather2');
        if (!response.ok) throw new Error('load failed');
        cards = await response.json();
      } catch {
        get('galleryCount').textContent = '読み込めませんでした。一度閉じて再度お試しください。';
        return;
      }
    }
    renderGallery();
  };
  get('galleryClose').onclick = () => get('galleryDialog').close();
  get('gallerySearch').oninput = () => { if (cards) renderGallery(); };
  get('galleryCategory').onchange = () => { if (cards) renderGallery(); };
})();
