let restaurants = [];
let selectedRestaurantId = null;
let mapInstance = null;

// Alustusfunktiot
function initApp() {
  fetchRestaurants();
  setupEventListeners();
  checkLoginStatus();
  loadTheme();
}

// Ravintoloiden haku
function fetchRestaurants() {
  fetch('https://media2.edu.metropolia.fi/restaurant/api/v1/restaurants')
    .then(response => {
      if (!response.ok) throw new Error('API virhe');
      return response.json();
    })
    .then(data => {
      restaurants = data;
      displayRestaurants(restaurants);
      setupSearch();
      setupMenuSearch();
    })
    .catch(error => {
      console.error('Virhe haettaessa ravintoloita:', error);
      document.getElementById('restaurantList').innerHTML = 
        '<li class="error">Ravintolatietoja ei saatu ladattua. Yritä myöhemmin uudelleen.</li>';
    });
}

// Ravintoloiden näyttäminen
function displayRestaurants(list) {
  const restaurantList = document.getElementById('restaurantList');
  restaurantList.innerHTML = '';

  if (list.length === 0) {
    restaurantList.innerHTML = '<li class="error">Ei ravintoloita</li>';
    return;
  }

  list.forEach(restaurant => {
    const li = document.createElement('li');
    const favoriteClass = getFavorites().includes(restaurant.name) ? 'active' : 'inactive';
    
    li.innerHTML = `
      <div class="restaurant-name clickable">
        ${restaurant.name}
        <span class="favorite ${favoriteClass}" data-name="${restaurant.name}">★</span>
      </div>
      <div class="info">
        <p>📍 ${restaurant.address}</p>
        <p>🏙️ ${restaurant.city}</p>
        <a href="https://maps.google.com?q=${restaurant.address}" target="_blank">Näytä kartalla</a>
      </div>
    `;

    li.querySelector('.restaurant-name').addEventListener('click', () => {
      selectedRestaurantId = restaurant._id;
      showRestaurantDetails(restaurant._id);
    });

    li.querySelector('.favorite').addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(restaurant.name);
      e.target.classList.toggle('inactive');
      e.target.classList.toggle('active');
    });

    restaurantList.appendChild(li);
  });
}

// Hakutoiminto
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    
    if (!term) {
      displayRestaurants(restaurants);
      return;
    }

    // Etsi ravintolat joiden nimi tai kaupunki ALKAA hakusanalla
    const filtered = restaurants.filter(r => 
      r.name.toLowerCase().startsWith(term) || 
      r.city.toLowerCase().startsWith(term)
    );
    
    // Jos ei löydy alkukirjaimella, näytä kaikki joissa hakusana esiintyy missä tahansa kohdassa
    if (filtered.length === 0) {
      const alternativeFilter = restaurants.filter(r => 
        r.name.toLowerCase().includes(term) || 
        r.city.toLowerCase().includes(term)
      );
      displayRestaurants(alternativeFilter);
    } else {
      displayRestaurants(filtered);
    }
  });
}

function setupMenuSearch() {
  const input = document.getElementById('restaurantSearchInput');
  const resultBox = document.getElementById('restaurantDropdown');  
  if (!input || !resultBox) return;

  input.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    resultBox.innerHTML = '';

    if (!term) return;

    const filtered = restaurants.filter(r =>
      r.name.toLowerCase().startsWith(term) || r.city.toLowerCase().startsWith(term)
    );

    const results = filtered.length ? filtered : restaurants.filter(r =>
      r.name.toLowerCase().includes(term) || r.city.toLowerCase().includes(term)
    );

    results.forEach(r => {
      const div = document.createElement('div');
      div.className = 'menu-search-item';
      div.textContent = r.name;

      div.addEventListener('click', () => {
        input.value = r.name;
        resultBox.innerHTML = '';
        selectedRestaurantId = r._id;

        document.getElementById('menuDisplay').innerHTML = `
          <p>Valittu ravintola: <strong>${r.name}</strong></p>
          <p>Voit nyt hakea ruokalistan!</p>
        `;

        // Aktivoi napit
        document.getElementById('dailyBtn').disabled = false;
        document.getElementById('weeklyBtn').disabled = false;
      });

      resultBox.appendChild(div);
    });
  });
}


// Karttafunktiot
function showMapWithRestaurants() {
  const mapDiv = document.getElementById('map');
  
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  mapInstance = L.map(mapDiv).setView([60.1699, 24.9384], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(mapInstance);

  // Lisää ravintolat kartalle
  restaurants.forEach(r => {
    if (r.location?.coordinates) {
      const [lon, lat] = r.location.coordinates;
      L.marker([lat, lon])
        .addTo(mapInstance)
        .bindPopup(`<strong>${r.name}</strong><br>${r.address}, ${r.city}`);
    }
  });

  // Käyttäjän sijainti
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const userLatLng = [position.coords.latitude, position.coords.longitude];
      L.marker(userLatLng).addTo(mapInstance)
        .bindPopup("Sijaintisi").openPopup();
      mapInstance.setView(userLatLng, 13);

      // Etsi lähin ravintola
      highlightNearestRestaurant(userLatLng);
    });
  }
}

function highlightNearestRestaurant(userLatLng) {
  let nearest = null;
  let minDistance = Infinity;
  
  restaurants.forEach(r => {
    if (r.location?.coordinates) {
      const [lon, lat] = r.location.coordinates;
      const dist = mapInstance.distance(userLatLng, [lat, lon]);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = r;
      }
    }
  });

  if (nearest) {
    const [lon, lat] = nearest.location.coordinates;
    L.circleMarker([lat, lon], {
      color: 'red',
      radius: 8
    }).addTo(mapInstance)
      .bindPopup(`<b>${nearest.name}</b><br>Lähin ravintola!`);
  }
}

// Ravintolan tiedot
function showRestaurantDetails(id) {
  const old = document.querySelector('.popup-info');
  if (old) old.remove();

  fetch(`https://media2.edu.metropolia.fi/restaurant/api/v1/restaurants/${id}`)
    .then(response => response.json())
    .then(data => {
      const popup = document.createElement('div');
      popup.classList.add('popup-info');
      popup.innerHTML = `
        <h4>${data.name}</h4>
        <p><strong>Osoite:</strong> ${data.address}, ${data.postalCode} ${data.city}</p>
        <p><strong>Puhelin:</strong> ${data.phone || 'Ei tiedossa'}</p>
        <p><strong>Palveluntarjoaja:</strong> ${data.company}</p>
        <hr />
        <div id="popupReviews"></div>
        <div class="review-form" style="margin-top: 10px;">
          <textarea id="popupReviewText" placeholder="Kirjoita arvostelu..."></textarea>
          <input id="popupReviewRating" type="number" min="1" max="5" placeholder="Arvosana 1-5" />
          <button id="popupReviewSubmit">Lähetä arvostelu</button>
        </div>
        <button class="close-popup">Sulje</button>
      `;
      
      document.body.appendChild(popup);
      selectedRestaurantId = data._id;
      showPopupReviews(data._id);

      popup.querySelector('.close-popup').addEventListener('click', () => popup.remove());
      
      popup.querySelector('#popupReviewSubmit').addEventListener('click', () => {
        const text = popup.querySelector('#popupReviewText').value.trim();
        const rating = parseInt(popup.querySelector('#popupReviewRating').value);
      
        if (!text || isNaN(rating) || rating < 1 || rating > 5) {
          alert('Täytä arvostelu ja arvosana (1-5)');
          return;
        }
      
        addReview(data._id, text, rating);
        showPopupReviews(data._id);
        popup.querySelector('#popupReviewText').value = '';
        popup.querySelector('#popupReviewRating').value = '';
      });
    })
    .catch(error => console.error('Virhe haettaessa ravintolan tietoja:', error));
}

// Ruokalistat
function getDailyMenu() {
  if (!selectedRestaurantId) return alert('Valitse ensin ravintola!');
  
  fetch(`https://media2.edu.metropolia.fi/restaurant/api/v1/restaurants/daily/${selectedRestaurantId}/fi`)
    .then(response => response.json())
    .then(data => {
      const menuSection = document.getElementById('menuDisplay');
      menuSection.innerHTML = data.courses?.length > 0 
        ? data.courses.map(course => `<div><strong>${course.name}</strong> – ${course.price} (${course.diets})</div>`).join('')
        : 'Ei ruokalistaa tälle päivälle.';
    })
    .catch(error => {
      console.error('Ruokalistan haku epäonnistui:', error);
      document.getElementById('menuDisplay').textContent = 'Virhe haettaessa ruokalistaa.';
    });
}

function getWeeklyMenu() {
  if (!selectedRestaurantId) return alert('Valitse ensin ravintola!');
  
  fetch(`https://media2.edu.metropolia.fi/restaurant/api/v1/restaurants/weekly/${selectedRestaurantId}/fi`)
    .then(response => response.json())
    .then(data => {
      const menuSection = document.getElementById('menuDisplay');
      menuSection.innerHTML = data.days?.length > 0
        ? data.days.map(day => `
            <h4>${day.date}</h4>
            ${day.courses.map(course => `<div><strong>${course.name}</strong> – ${course.price} (${course.diets})</div>`).join('')}
          `).join('')
        : 'Ei ruokalistaa tälle viikolle.';
    })
    .catch(error => {
      console.error('Viikkoruokalistan haku epäonnistui:', error);
      document.getElementById('menuDisplay').textContent = 'Virhe haettaessa ruokalistaa.';
    });
}

// Suosikkitoiminnot
function toggleFavorite(name) {
  let favs = getFavorites();
  favs = favs.includes(name) 
    ? favs.filter(n => n !== name) 
    : [...favs, name];
  localStorage.setItem('favorites', JSON.stringify(favs));
}

function getFavorites() {
  return JSON.parse(localStorage.getItem('favorites') || '[]');
}

function showFavorites() {
  const favList = document.getElementById('favoritesList');
  const favs = getFavorites();
  
  // Tyhjennä lista ensin
  favList.innerHTML = '';

  if (favs.length === 0) {
    favList.innerHTML = '<li class="no-favorites">Ei vielä suosikkeja</li>';
    return;
  }

  favs.forEach(name => {
    const li = document.createElement('li');
    li.classList.add('favorite-item');
    
    // Etsi ravintolan tiedot
    const restaurant = restaurants.find(r => r.name === name);
    
    if (restaurant) {
      // Jos ravintola löytyy, näytä täydet tiedot
      li.innerHTML = `
        <div class="restaurant-info">
          <div class="restaurant-name clickable">
            ${restaurant.name}
            <span class="favorite active" data-name="${restaurant.name}">★</span>
          </div>
          <div class="restaurant-details">
            <p>📍 ${restaurant.address}</p>
            <p>🏙️ ${restaurant.city}</p>
          </div>
        </div>
      `;

      // Klikkaukset
      li.querySelector('.restaurant-name').addEventListener('click', () => {
        showRestaurantDetails(restaurant._id);
      });
    } else {
      // Jos ravintolaa ei löydy (esim. poistettu rajapinnasta)
      li.innerHTML = `
        <div class="restaurant-info">
          <div class="restaurant-name">
            ${name} (poistettu)
            <span class="favorite active" data-name="${name}">★</span>
          </div>
        </div>
      `;
    }

    // Suosikkitähti
    li.querySelector('.favorite').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(name);
      showFavorites(); // Päivitä lista
    });

    favList.appendChild(li);
  });
}

// Arvostelut
function addReview(restaurantId, reviewText, rating) {
  const reviews = JSON.parse(localStorage.getItem("reviews") || "{}");
  if (!reviews[restaurantId]) reviews[restaurantId] = [];

  const user = localStorage.getItem("profileData")
    ? JSON.parse(localStorage.getItem("profileData")).name + ' ' + 
      JSON.parse(localStorage.getItem("profileData")).last
    : localStorage.getItem('userName') || "Tuntematon";

  reviews[restaurantId].push({
    text: reviewText,
    rating,
    user,
    date: new Date().toLocaleDateString("fi-FI"),
    edited: false,
    restaurantName: getRestaurantNameById(restaurantId)
  });

  localStorage.setItem("reviews", JSON.stringify(reviews));
}

function showPopupReviews(restaurantId) {
  const container = document.getElementById('popupReviews');
  const reviewsData = JSON.parse(localStorage.getItem('reviews') || '{}');
  const reviews = reviewsData[restaurantId] || [];

  container.innerHTML = reviews.length === 0
    ? '<p>Ei vielä arvosteluja.</p>'
    : '<h5>Aiemmat arvostelut:</h5>' + reviews.map(r => {
        const displayUser = r.user || 
          (localStorage.getItem("profileData") 
            ? JSON.parse(localStorage.getItem("profileData")).name + ' ' + 
              JSON.parse(localStorage.getItem("profileData")).last 
            : "Tuntematon");
        
        return `
          <div class="popup-review">
            <p><strong>${r.rating}/5</strong> – ${r.text}</p>
            <p style="font-size: 0.8em; color: #aaa;">${displayUser} – ${r.date}${r.edited ? ' (muokattu)' : ''}</p>
          </div>
        `;
      }).join('');
}

function loadUserReviewHistory() {
  const list = document.getElementById("userReviewsList");
  const reviews = JSON.parse(localStorage.getItem("reviews") || "{}");
  
  list.innerHTML = "";
  let hasReviews = false;

  Object.entries(reviews).forEach(([restaurantId, reviewArray]) => {
    const restaurantName = getRestaurantNameById(restaurantId);
    
    reviewArray.forEach((review, index) => {
      hasReviews = true;
      const div = document.createElement("div");
      div.className = "review-block";
      div.innerHTML = `
        <strong>${restaurantName}</strong><br>
        ${review.rating}/5 – ${review.text}<br>
        <small>${review.date || "Pvm ei saatavilla"}</small>
        <button class="delete-review-btn" title="Poista" data-id="${restaurantId}" data-index="${index}">🗑️</button>
      `;
      list.appendChild(div);
    });
  });

  if (!hasReviews) {
    list.innerHTML = "<p>Ei vielä arvosteluja.</p>";
  }

  document.querySelectorAll(".delete-review-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const { id, index } = btn.dataset;
      const all = JSON.parse(localStorage.getItem("reviews") || "{}");
      if (all[id]) {
        all[id].splice(index, 1);
        if (all[id].length === 0) delete all[id];
        localStorage.setItem("reviews", JSON.stringify(all));
        loadUserReviewHistory();
      }
    });
  });
}

function getRestaurantNameById(id) {
  const match = restaurants.find(r => r._id === id);
  return match ? match.name : "Tuntematon ravintola";
}

// Kirjautumistoiminnot
function handleLogin() {
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const remember = document.getElementById('rememberMe').checked;

  if (!username || !password) {
    showAuthMessage('Täytä molemmat kentät', true);
    return;
  }

  fetch('https://media2.edu.metropolia.fi/restaurant/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data?.token && data?.data?.username) {
        const storage = remember ? localStorage : sessionStorage;
        
        storage.setItem('token', data.token);
        storage.setItem('userName', data.data.username);
        storage.setItem('email', data.data.email);

        updateUIAfterLogin(data.data.username, data.data.email);
        showAuthMessage('Kirjauduttu sisään', false);
      } else {
        showAuthMessage('Virhe: ' + (data.message || 'Väärät tunnukset'), true);
      }
    })
    .catch(err => {
      console.error('Virhe kirjautumisessa:', err);
      showAuthMessage('Virhe kirjautumisessa', true);
    });
}

function handleRegister() {
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const email = `${username}@example.com`;

  if (!username || !password) {
    showAuthMessage('Täytä käyttäjänimi ja salasana', true);
    return;
  }

  fetch('https://media2.edu.metropolia.fi/restaurant/api/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email })
  })
    .then(res => res.json())
    .then(data => {
      if (data.message === 'user created') {
        showAuthMessage('Rekisteröinti onnistui! Voit nyt kirjautua sisään.', false);
      } else {
        showAuthMessage('Virhe: ' + (data.message || 'Tarkista tiedot'), true);
      }
    })
    .catch(err => showAuthMessage('Virhe palvelimessa', true));
}

function handleLogout() {
  localStorage.clear();
  sessionStorage.clear();
  
  document.getElementById('mainHeader').style.display = 'flex';
  document.querySelector('.main-nav').style.display = 'none';
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('loginButton').style.display = 'inline-block';
  document.getElementById('logoutButton').style.display = 'none';
  document.getElementById('profileButton').style.display = 'none';

  ['profileSection', 'homeSection', 'restaurantSection', 'menuSection'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });

  showAuthMessage('Olet kirjautunut ulos.', false);
}

function checkLoginStatus() {
  const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
  const token = storage.getItem('token');
  const userName = storage.getItem('userName');
  const email = storage.getItem('email');

  if (token && userName && email) {
    updateUIAfterLogin(userName, email);
  }
}

function updateUIAfterLogin(username, email) {
  document.getElementById('usernameLabel').textContent = username;
  document.getElementById('emailInput').value = email;

  document.getElementById('mainHeader').style.display = 'flex';
  document.querySelector('.main-nav').style.display = 'flex';
  document.getElementById('loginButton').style.display = 'none';
  document.getElementById('logoutButton').style.display = 'inline-block';
  document.getElementById('profileButton').style.display = 'inline-block';
  document.getElementById('authSection').style.display = 'none';

  toggleSection('home');
  loadProfileData();
}

// Profiilitoiminnot
function toggleProfileEdit(mode) {
  const fields = ['nameInput', 'lastNameInput', 'dobInput'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !mode;
  });

  document.getElementById('editControls').style.display = mode ? 'flex' : 'none';
  document.getElementById('editProfileBtn').style.display = mode ? 'none' : 'inline-block';
  document.querySelector('.image-upload').classList.toggle('editing', mode);
}

function loadProfileData() {

  const profileData = JSON.parse(localStorage.getItem('profileData') || '{}');
  const loginEmail = localStorage.getItem('email') || sessionStorage.getItem('email');
  const userName = localStorage.getItem('userName') || sessionStorage.getItem('userName');

  document.getElementById('nameInput').value = profileData.name || '';
  document.getElementById('lastNameInput').value = profileData.last || '';
  document.getElementById('dobInput').value = profileData.dob || '';
  
  document.getElementById('emailInput').value = loginEmail || profileData.email || '';
  
  const emailInput = document.getElementById('emailInput');
  emailInput.disabled = true;
  emailInput.readOnly = true;
  emailInput.style.cursor = 'not-allowed';

  document.getElementById('fullName').textContent = 
    `${profileData.name || ''} ${profileData.last || ''}`.trim() || userName || 'Ei nimeä';

  const img = localStorage.getItem('profileImage');
  if (img) {
    const preview = document.getElementById('preview');
    preview.src = img;
    preview.style.objectFit = 'cover';
    preview.style.borderRadius = '50%';
  }
}

function saveProfile() {
  const name = document.getElementById('nameInput').value.trim();
  const last = document.getElementById('lastNameInput').value.trim();
  const dob = document.getElementById('dobInput').value;
  
  if (!name || !last) {
    document.getElementById('profileError').textContent = 'Täytä pakolliset kentät (*)';
    return;
  }

  const profileData = { 
    name, 
    last, 
    dob 
  };
  
  localStorage.setItem('profileData', JSON.stringify(profileData));
  document.getElementById('fullName').textContent = `${name} ${last}`;
  document.getElementById('profileMessage').textContent = 'Profiilitiedot tallennettu!';
  document.getElementById('profileError').textContent = '';
  toggleProfileEdit(false);
}

// Muut toiminnot
function toggleSection(section) {
  const sections = ['home', 'restaurant', 'menu', 'profile', 'favorites', 'map', 'reviewsHistory'];
  sections.forEach(id => {
    const el = document.getElementById(`${id}Section`);
    if (el) el.style.display = 'none';
  });

  const active = document.getElementById(`${section}Section`);
  if (active) active.style.display = 'block';
}

function loadTheme() {
  const theme = localStorage.getItem('theme');
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  }
}

function showAuthMessage(msg, isError = false) {
  const el = document.getElementById('authMessage');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? 'var(--error)' : 'var(--success)';
}

function getGreeting(name) {
  const hour = new Date().getHours();
  let greeting = "Mukava nähdä sinut taas";

  if (hour >= 5 && hour < 12) greeting = "Hyvää huomenta";
  else if (hour >= 12 && hour < 17) greeting = "Hyvää iltapäivää";
  else if (hour >= 17 && hour < 22) greeting = "Hyvää iltaa";
  else greeting = "Mene nukkumaan";

  return `${greeting}, <strong>${name}</strong>!`;
}

// Tapahtumankuuntelijat
function setupEventListeners() {
  // Näkymät
  document.getElementById('navHome').addEventListener('click', () => toggleSection('home'));
  document.getElementById('navRestaurants').addEventListener('click', () => toggleSection('restaurant'));
  document.getElementById('navMenu').addEventListener('click', () => toggleSection('menu'));
  document.getElementById('navFavorites').addEventListener('click', () => {
    toggleSection('favorites');
    showFavorites();
  });
  document.getElementById('navMap').addEventListener('click', () => {
    toggleSection('map');
    showMapWithRestaurants();
  });
  document.getElementById('navMyReviews').addEventListener('click', () => {
    toggleSection('reviewsHistory');
    loadUserReviewHistory();
  });

  // Ruokalistanapit
  document.getElementById('dailyBtn').addEventListener('click', getDailyMenu);
  document.getElementById('weeklyBtn').addEventListener('click', getWeeklyMenu);
  

  // Kirjautuminen
  document.getElementById('doLogin').addEventListener('click', handleLogin);
  document.getElementById('doRegister').addEventListener('click', handleRegister);
  document.getElementById('logoutButton').addEventListener('click', handleLogout);

  // Profiili
  document.getElementById('profileButton').addEventListener('click', () => {
    toggleSection('profile');
    loadProfileData();
  });
  document.getElementById('editProfileBtn').addEventListener('click', () => toggleProfileEdit(true));
  document.getElementById('cancelProfile').addEventListener('click', () => {
    loadProfileData();
    toggleProfileEdit(false);
    document.getElementById('profileMessage').textContent = '';
    document.getElementById('profileError').textContent = '';
  });
  document.getElementById('saveProfile').addEventListener('click', saveProfile);

  // Teema
  document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
  });

  // Mobiilivalikko
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('show'));
  }

  // Profiilikuva
  document.getElementById('profilePic').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('preview');
      preview.src = e.target.result;
      localStorage.setItem('profileImage', e.target.result);
      preview.style.objectFit = 'cover';
      preview.style.borderRadius = '50%';
    };
    reader.readAsDataURL(e.target.files[0]);
  });

  // Tervehdys
  document.addEventListener("DOMContentLoaded", () => {
    const welcomeEl = document.getElementById("welcomeUser");
    const profile = localStorage.getItem("profileData");

    if (welcomeEl && profile) {
      try {
        const parsed = JSON.parse(profile);
        const fullName = `${parsed.name || ''} ${parsed.last || ''}`.trim();
        if (fullName) {
          welcomeEl.innerHTML = getGreeting(fullName);
        }
      } catch (e) {
        console.warn("Ei voitu näyttää tervehdystä:", e);
      }
    }
  });
}

// Käynnistä sovellus
initApp();