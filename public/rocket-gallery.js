(() => {
  const get = id => document.getElementById(id);
  const weatherNames = {rain:'雨', thunderstorm:'雷雨', sunny:'晴れ', 'partly-cloudy':'晴れと曇り'};
  const categories = new Map([...get('galleryCategory').options].filter(option => option.value).map(option => [option.value, option.textContent]));
  const rank = [...categories.keys()];
  const readings = {'挑戦者':'ちょうせんしゃ','ロケット団員':'ろけっとだんいん'};
  const collator = new Intl.Collator('ja');
  const normalize = name => name.normalize('NFKC').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0)-96));
  let cards;
  function renderGallery() {
    const query = get('gallerySearch').value.trim();
    const category = get('galleryCategory').value;
    const matches = cards.filter(card => normalize(card.name).includes(normalize(query)) && (!category || card.category === category));
    matches.sort((a,b) => rank.indexOf(a.category)-rank.indexOf(b.category)
      || collator.compare(normalize(readings[a.name] || a.name), normalize(readings[b.name] || b.name))
      || (a.level || 0)-(b.level || 0));
    let lastCategory;
    get('galleryGrid').replaceChildren(...matches.flatMap(card => {
      const button = document.createElement('button');
      button.className = 'gallery-card';
      const image = document.createElement('img');
      image.src = card.image;
      image.alt = card.name || card.id;
      image.loading = 'lazy';
      const caption = document.createElement('span');
      caption.textContent = (card.copies ? card.copies + '枚 · ' : '') + (card.name || card.id) + (card.level ? ' Lv.' + card.level : '') + (card.weather ? ' · ' + (weatherNames[card.weather] || card.weather) : '');
      button.append(image, caption);
      if (card.redHp != null) {
        const details = document.createElement('small');
        details.textContent = '赤♥' + card.redHp + ' · ' + card.cardType + ' · 特性 ' + card.ability + ' · ' + (card.attacks || []).map(move => move.name + (move.damage ? ' ' + move.damage : '')).join('／');
        button.append(details);
      }
      button.onclick = () => {
        get('cardPreviewTitle').textContent = caption.textContent;
        get('cardPreviewImage').src = card.image;
        get('cardPreviewImage').alt = caption.textContent;
        get('cardPreviewDialog').showModal();
      };
      if (category || card.category === lastCategory) return [button];
      lastCategory = card.category;
      const heading = document.createElement('h3');
      heading.style.gridColumn = '1 / -1';
      heading.textContent = categories.get(card.category);
      return [heading, button];
    }));
    get('galleryCount').textContent = matches.length + '種類';
  }
  get('galleryOpen').onclick = async () => {
    get('galleryDialog').showModal();
    if (!cards) {
      get('galleryCount').textContent = '読み込み中…';
      try {
        const response = await fetch('/rocket-gallery.json?v=20261113-names');
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
