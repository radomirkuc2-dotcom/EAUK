// ═══════════════════════════════════════════════════════════════════
// eAUKCIJA.me - PROFESIONALNA PWA APLIKACIJA
// Autor: Claude AI | Verzija: 2.0 Pro
// ═══════════════════════════════════════════════════════════════════

'use strict';

// ═══════════════════════════════════════════════════════════════════
// FIREBASE KONFIGURACIJA
// ═══════════════════════════════════════════════════════════════════

const firebaseConfig = {
    apiKey: "AIzaSyDNRI9Rk7CjckhSeFngeEwzxheNl4EwhE4",
    authDomain: "eaukcija-cfed6.firebaseapp.com",
    projectId: "eaukcija-cfed6",
    storageBucket: "eaukcija-cfed6.firebasestorage.app",
    messagingSenderId: "773592461426",
    appId: "1:773592461426:web:ad3ff038317dcfb5b6d2eb"
};

const ADMIN_EMAIL = "radomirkuc2@gmail.com";

// ═══════════════════════════════════════════════════════════════════
// GLOBALNE VARIJABLE
// ═══════════════════════════════════════════════════════════════════

let db, auth, storage;
let currentUser = null;
let currentPage = 'home';
let allAuctions = [];
let userFavorites = [];
let selectedFiles = [];
let currentCategory = 'all';
let installPromptEvent = null;
let notificationPermission = 'default';

// ═══════════════════════════════════════════════════════════════════
// INICIJALIZACIJA APLIKACIJE
// ═══════════════════════════════════════════════════════════════════

const App = {
    async init() {
        try {
            console.log('🚀 Inicijalizacija...');
            
            // Force hide splash after 5 seconds no matter what
            setTimeout(() => {
                const splash = document.getElementById('splash');
                if (splash) {
                    console.log('⚠️ Force hiding splash');
                    splash.style.display = 'none';
                }
            }, 5000);
            
            await this.loadFirebase();
            await this.initializeFirebase();
            this.setupEventListeners();
            this.loadTheme();
            this.checkInstallPrompt();
            this.requestNotificationPermission();
            this.hideSplash();
            this.renderPage('home');
            
            console.log('✅ Aplikacija pokrenuta');
        } catch (error) {
            console.error('❌ Init error:', error);
            
            // Hide splash even on error
            const splash = document.getElementById('splash');
            if (splash) {
                splash.style.display = 'none';
            }
            
            // Show error message
            document.getElementById('mainContent').innerHTML = `
                <div style="text-align:center;padding:60px 20px;">
                    <h2 style="color:var(--accent);margin-bottom:20px;">⚠️ Greška</h2>
                    <p style="color:var(--text-muted);margin-bottom:20px;">Došlo je do greške pri učitavanju aplikacije.</p>
                    <button onclick="location.reload()" class="btn btn-primary">🔄 Osvježi stranicu</button>
                </div>
            `;
            
            this.showToast('Greška pri pokretanju aplikacije', 'error');
        }
    },

    async loadFirebase() {
        // Check if Firebase is already loaded (from HTML)
        if (typeof firebase !== 'undefined') {
            console.log('✅ Firebase već učitan iz HTML-a');
            return;
        }
        
        console.log('📦 Učitavam Firebase dinamički...');
        
        const scripts = [
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
        ];

        for (const src of scripts) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    console.log('✅ Učitano:', src.split('/').pop());
                    resolve();
                };
                script.onerror = () => {
                    console.error('❌ Greška:', src);
                    reject(new Error('Failed to load: ' + src));
                };
                
                // Timeout after 10 seconds
                setTimeout(() => reject(new Error('Timeout: ' + src)), 10000);
                
                document.head.appendChild(script);
            });
        }
        
        console.log('✅ Firebase skripte učitane');
    },

    initializeFirebase() {
        console.log('🔥 Inicijalizujem Firebase...');
        
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase nije učitan!');
        }
        
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        
        console.log('✅ Firebase inicijalizovan');

        auth.onAuthStateChanged(user => {
            currentUser = user;
            console.log('👤 User:', user ? user.email : 'Nije prijavljen');
            this.updateAuthUI();
            if (user) {
                this.loadUserData();
                if (user.email === ADMIN_EMAIL) {
                    document.getElementById('adminLink').style.display = 'flex';
                }
            }
        });

        this.loadAuctions();
    },

    setupEventListeners() {
        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                document.getElementById('userDropdown').style.display = 'none';
            }
        });

        // Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(() => console.log('✅ Service Worker registrovan'))
                .catch(err => console.log('SW error:', err));
        }
    },

    hideSplash() {
        setTimeout(() => {
            const splash = document.getElementById('splash');
            if (splash) {
                splash.style.opacity = '0';
                setTimeout(() => {
                    if (splash.parentNode) {
                        splash.parentNode.removeChild(splash);
                    }
                }, 500);
            }
        }, 2500);
    },

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');

        if (currentUser) {
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            userMenu.style.display = 'block';

            const avatarLetter = document.getElementById('avatarLetter');
            const userName = document.getElementById('userName');
            const userEmail = document.getElementById('userEmail');

            avatarLetter.textContent = currentUser.displayName ? 
                currentUser.displayName.charAt(0).toUpperCase() : 
                currentUser.email.charAt(0).toUpperCase();
            
            userName.textContent = currentUser.displayName || 'Korisnik';
            userEmail.textContent = currentUser.email;
        } else {
            loginBtn.style.display = 'block';
            registerBtn.style.display = 'block';
            userMenu.style.display = 'none';
        }
    },

    async loadUserData() {
        if (!currentUser) return;
        
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                userFavorites = userData.favorites || [];
            }
        } catch (error) {
            console.error('Load user data error:', error);
        }
    },

    loadAuctions() {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        db.collection('aukcije')
            .where('timestamp', '>', thirtyDaysAgo)
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                allAuctions = [];
                snapshot.forEach(doc => {
                    const auction = { id: doc.id, ...doc.data() };
                    auction.isActive = auction.endTime > Date.now();
                    allAuctions.push(auction);
                });
                
                if (currentPage === 'home' || currentPage === 'auctions') {
                    this.renderAuctions();
                }
            });
    },

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.getElementById('themeIcon').textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    },

    checkInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            installPromptEvent = e;
            
            // Show install prompt after 5 seconds
            setTimeout(() => {
                if (!localStorage.getItem('installDismissed')) {
                    document.getElementById('installPrompt').style.display = 'flex';
                }
            }, 5000);
        });
    },

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            setTimeout(() => {
                Notification.requestPermission().then(permission => {
                    notificationPermission = permission;
                    if (permission === 'granted') {
                        this.showToast('Notifikacije omogućene!', 'success');
                    }
                });
            }, 10000);
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════

function navigateTo(page) {
    if (['create', 'myAuctions', 'profile', 'favorites'].includes(page) && !currentUser) {
        App.showToast('Morate biti prijavljeni!', 'warning');
        openModal('auth', 'login');
        return;
    }

    currentPage = page;
    App.renderPage(page);
    
    // Update bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Update sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Close menu
    toggleMenu(false);
    window.scrollTo(0, 0);
}

App.renderPage = function(page) {
    const content = document.getElementById('mainContent');
    
    const pages = {
        home: this.renderHomePage,
        auctions: this.renderAuctionsPage,
        create: this.renderCreatePage,
        myAuctions: this.renderMyAuctionsPage,
        favorites: this.renderFavoritesPage,
        profile: this.renderProfilePage,
        vip: this.renderVIPPage,
        premium: this.renderPremiumPage,
        chat: this.renderChatPage,
        suggestions: this.renderSuggestionsPage,
        donations: this.renderDonationsPage,
        rewards: this.renderRewardsPage,
        terms: this.renderTermsPage,
        privacy: this.renderPrivacyPage,
        admin: this.renderAdminPage
    };

    const renderFunction = pages[page];
    if (renderFunction) {
        content.innerHTML = renderFunction.call(this);
        
        // Setup file upload after create page renders
        if (page === 'create') {
            setTimeout(() => {
                const uploadZone = document.getElementById('uploadZone');
                const fileInput = document.getElementById('fileInput');
                
                if (uploadZone && fileInput) {
                    uploadZone.onclick = () => fileInput.click();
                    fileInput.onchange = (e) => handleFiles(e.target.files);
                    
                    // Drag & drop
                    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
                        uploadZone.addEventListener(evt, e => {
                            e.preventDefault();
                            e.stopPropagation();
                        });
                    });
                    
                    uploadZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
                }
            }, 100);
        }
    } else {
        content.innerHTML = '<div class="error-page"><h2>404</h2><p>Stranica nije pronađena</p></div>';
    }
};

// ═══════════════════════════════════════════════════════════════════
// PAGE RENDERERS
// ═══════════════════════════════════════════════════════════════════

App.renderHomePage = function() {
    return `
        <div class="page-container">
            <div class="hero-section">
                <h1 class="hero-title gradient-text">eAukcija.me</h1>
                <p class="hero-subtitle">Moderna aukcijska platforma u Crnoj Gori</p>
                <p style="color:var(--text-muted);font-size:0.95rem;margin-top:10px;line-height:1.7;padding:0 20px;">
                    Kupujte i prodajte bilo šta brzo i jednostavno.<br>
                    Povoljne cijene, sigurne transakcije, širok izbor proizvoda.
                </p>
            </div>

            <div class="auction-types-section" style="margin:30px 0;">
                <h2 class="section-title" style="text-align:center;margin-bottom:25px;">Izaberite Tip Aukcije</h2>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;max-width:700px;margin:0 auto;">
                    
                    <div class="auction-type-card classic" onclick="navigateTo('create')" style="background:linear-gradient(135deg,#6C5CE7,#00D9FF);padding:30px;border-radius:20px;cursor:pointer;transition:all 0.3s;box-shadow:0 8px 25px rgba(108,92,231,0.3);position:relative;overflow:hidden;">
                        <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:rgba(255,255,255,0.1);border-radius:50%;"></div>
                        <div style="position:relative;z-index:1;">
                            <div style="font-size:3.5rem;margin-bottom:15px;text-align:center;">🔥</div>
                            <h3 style="color:white;font-size:1.4rem;font-weight:800;margin-bottom:12px;text-align:center;">KLASIČNA AUKCIJA</h3>
                            <p style="color:rgba(255,255,255,0.9);font-size:0.95rem;line-height:1.6;margin-bottom:15px;text-align:center;">Ponude idu naviše - pobjeđuje najveća!</p>
                            <div style="background:rgba(255,255,255,0.2);border-radius:12px;padding:12px;margin-bottom:15px;">
                                <div style="color:white;font-size:0.85rem;margin-bottom:8px;"><strong>✓</strong> Svaka ponuda viša od prethodne</div>
                                <div style="color:white;font-size:0.85rem;margin-bottom:8px;"><strong>✓</strong> Timer se smanjuje sa ponudama</div>
                                <div style="color:white;font-size:0.85rem;"><strong>✓</strong> Najbolje za nove proizvode</div>
                            </div>
                            <div style="text-align:center;margin-top:15px;">
                                <div style="display:inline-block;background:white;color:#6C5CE7;padding:10px 25px;border-radius:25px;font-weight:700;font-size:0.9rem;">Kreiraj Aukciju →</div>
                            </div>
                        </div>
                    </div>

                    <div class="auction-type-card reverse" onclick="navigateTo('create')" style="background:linear-gradient(135deg,#FF3366,#FFA500);padding:30px;border-radius:20px;cursor:pointer;transition:all 0.3s;box-shadow:0 8px 25px rgba(255,51,102,0.3);position:relative;overflow:hidden;">
                        <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:rgba(255,255,255,0.1);border-radius:50%;"></div>
                        <div style="position:relative;z-index:1;">
                            <div style="font-size:3.5rem;margin-bottom:15px;text-align:center;">💎</div>
                            <h3 style="color:white;font-size:1.4rem;font-weight:800;margin-bottom:12px;text-align:center;">OBRNUTA AUKCIJA</h3>
                            <p style="color:rgba(255,255,255,0.9);font-size:0.95rem;line-height:1.6;margin-bottom:15px;text-align:center;">Ponude idu naniže - pregovarajte cijenu!</p>
                            <div style="background:rgba(255,255,255,0.2);border-radius:12px;padding:12px;margin-bottom:15px;">
                                <div style="color:white;font-size:0.85rem;margin-bottom:8px;"><strong>✓</strong> Kupci nude niže cijene</div>
                                <div style="color:white;font-size:0.85rem;margin-bottom:8px;"><strong>✓</strong> Vi prihvatate najbolju ponudu</div>
                                <div style="color:white;font-size:0.85rem;"><strong>✓</strong> Brza prodaja, fleksibilno</div>
                            </div>
                            <div style="text-align:center;margin-top:15px;">
                                <div style="display:inline-block;background:white;color:#FF3366;padding:10px 25px;border-radius:25px;font-weight:700;font-size:0.9rem;">Kreiraj Aukciju →</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="search-section">
                <div class="search-bar-wrapper">
                    <input type="text" class="search-input" id="searchInput" placeholder="Pretražite aukcije..." onkeyup="handleSearch(event)">
                    <button class="search-btn" onclick="performSearch()">
                        <span>🔍</span>
                    </button>
                </div>
            </div>

            <div class="categories-section">
                <h2 class="section-title">Kategorije</h2>
                <div class="categories-grid">
                    ${this.renderCategories()}
                </div>
            </div>

            <div class="partners-section" style="margin:40px 0;">
                <h2 class="section-title">Najbolji Prodavci</h2>
                <div class="partners-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
                    <div class="partner-card" style="background:var(--bg-secondary);padding:20px;border-radius:var(--radius-lg);text-align:center;border:2px solid var(--border-color);cursor:pointer;transition:var(--transition);" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-color)'">
                        <div style="font-size:2rem;margin-bottom:10px;">🚗</div>
                        <div style="font-weight:700;margin-bottom:5px;font-size:0.9rem;">Auto Kuće CG</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">Premium automobili</div>
                    </div>
                    <div class="partner-card" style="background:var(--bg-secondary);padding:20px;border-radius:var(--radius-lg);text-align:center;border:2px solid var(--border-color);cursor:pointer;transition:var(--transition);" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-color)'">
                        <div style="font-size:2rem;margin-bottom:10px;">🏠</div>
                        <div style="font-weight:700;margin-bottom:5px;font-size:0.9rem;">Nekretnine Plus</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">Stanovi i kuće</div>
                    </div>
                    <div class="partner-card" style="background:var(--bg-secondary);padding:20px;border-radius:var(--radius-lg);text-align:center;border:2px solid var(--border-color);cursor:pointer;transition:var(--transition);" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-color)'">
                        <div style="font-size:2rem;margin-bottom:10px;">⚡</div>
                        <div style="font-weight:700;margin-bottom:5px;font-size:0.9rem;">Tech Store</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">Najnovija tehnika</div>
                    </div>
                    <div class="partner-card" style="background:var(--bg-secondary);padding:20px;border-radius:var(--radius-lg);text-align:center;border:2px solid var(--border-color);cursor:pointer;transition:var(--transition);" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-color)'">
                        <div style="font-size:2rem;margin-bottom:10px;">🪑</div>
                        <div style="font-weight:700;margin-bottom:5px;font-size:0.9rem;">Namještaj Studio</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">Kvalitetan namještaj</div>
                    </div>
                </div>
            </div>

            <div class="cta-section" style="background:linear-gradient(135deg,rgba(108,92,231,0.1),rgba(0,217,255,0.1));padding:30px 20px;border-radius:var(--radius-xl);text-align:center;margin:40px 0;">
                <h2 style="font-size:clamp(1.3rem,5vw,1.75rem);font-weight:800;margin-bottom:15px;">Imate nešto za prodaju?</h2>
                <p style="color:var(--text-secondary);margin-bottom:20px;font-size:0.95rem;">Objavite svoju aukciju za manje od 2 minuta!</p>
                <button class="btn btn-primary" onclick="navigateTo('create')" style="max-width:280px;margin:0 auto;display:block;">
                    ➕ Dodaj Svoju Aukciju
                </button>
            </div>

            <div class="featured-section">
                <div class="section-header">
                    <h2 class="section-title">Istaknute Aukcije</h2>
                    <a href="#" onclick="navigateTo('auctions')" class="view-all-link">Vidi sve →</a>
                </div>
                <div class="auctions-grid" id="homeAuctions">
                    ${this.renderAuctions(allAuctions.slice(0, 6))}
                </div>
            </div>
        </div>
    `;
};

App.renderCategories = function() {
    const categories = [
        { id: 'automobili', name: 'Automobili', icon: '🚗' },
        { id: 'nekretnine', name: 'Nekretnine', icon: '🏠' },
        { id: 'namjestaj', name: 'Namještaj', icon: '🪑' },
        { id: 'tehnika', name: 'Tehnika', icon: '⚡' },
        { id: 'alati', name: 'Alati', icon: '🔧' },
        { id: 'telefoni', name: 'Telefoni', icon: '📱' }
    ];

    return categories.map(cat => `
        <div class="category-card" onclick="filterCategory('${cat.id}'); event.stopPropagation();">
            <div class="category-icon">${cat.icon}</div>
            <div class="category-name">${cat.name}</div>
        </div>
    `).join('');
};

App.renderAuctionsPage = function() {
    return `
        <div class="page-container">
            <h1 class="page-title">Sve Aukcije</h1>
            
            <div class="filters-section">
                <div class="filter-chips">
                    <button class="filter-chip active" onclick="showAllAuctions()">📋 Sve</button>
                    <button class="filter-chip" onclick="filterByCategory('automobili')">🚗 Auto</button>
                    <button class="filter-chip" onclick="filterByCategory('nekretnine')">🏠 Nekretnine</button>
                    <button class="filter-chip" onclick="filterByCategory('namjestaj')">🪑 Namještaj</button>
                    <button class="filter-chip" onclick="filterByCategory('tehnika')">⚡ Tehnika</button>
                    <button class="filter-chip" onclick="filterByCategory('alati')">🔧 Alati</button>
                    <button class="filter-chip" onclick="filterByCategory('telefoni')">📱 Telefoni</button>
                </div>
                
                <select class="sort-select" onchange="sortAuctions(this.value)">
                    <option value="newest">Najnovije</option>
                    <option value="ending">Uskoro istječe</option>
                    <option value="price-low">Cijena: Nisko → Visoko</option>
                    <option value="price-high">Cijena: Visoko → Nisko</option>
                    <option value="popular">Najpopularnije</option>
                </select>
            </div>

            <div class="auctions-grid" id="allAuctionsGrid">
                ${this.renderAuctions(allAuctions)}
            </div>
        </div>
    `;
};

App.renderAuctions = function(auctions) {
    if (!auctions || auctions.length === 0) {
        return '<div class="empty-state"><p>Nema aukcija</p></div>';
    }

    return auctions.map(auction => {
        const timeLeft = auction.endTime - Date.now();
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const isFavorite = userFavorites.includes(auction.id);

        return `
            <div class="auction-card" onclick="openAuctionDetail('${auction.id}')">
                <div class="auction-image-container">
                    <img src="${auction.slike[0]}" alt="${auction.naslov}" class="auction-image">
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(event, '${auction.id}')">
                        <span>${isFavorite ? '❤️' : '🤍'}</span>
                    </button>
                    ${auction.slike.length > 1 ? `<div class="image-count">📸 ${auction.slike.length}</div>` : ''}
                    <div class="timer-badge">${hours > 0 ? `⏰ ${hours}h ${minutes}m` : `⏰ ${minutes}m`}</div>
                </div>
                <div class="auction-card-body">
                    <div class="seller-info-mini">
                        <div class="seller-avatar">${auction.userName.charAt(0).toUpperCase()}</div>
                        <div class="seller-details">
                            <div class="seller-name">
                                ${auction.userName}
                                ${auction.isVIP ? '<span class="badge badge-vip">VIP</span>' : ''}
                                ${auction.verified ? '<span class="badge badge-verified">✓</span>' : ''}
                            </div>
                            <div class="seller-rating">${'⭐'.repeat(Math.round(auction.rating || 5))}</div>
                        </div>
                    </div>
                    <h3 class="auction-title">${auction.naslov}</h3>
                    <div class="auction-location">📍 ${auction.lokacija}</div>
                    <div class="auction-price">${auction.cijena.toLocaleString()} €</div>
                    <div class="auction-meta">
                        <span>💰 ${auction.bids?.length || 0} ponuda</span>
                        <span>👁️ ${auction.views || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

App.renderCreatePage = function() {
    return `
        <div class="page-container">
            <h1 class="page-title">Dodaj Novu Aukciju</h1>
            <form class="create-form" onsubmit="handleCreateAuction(event)">
                
                <div class="form-group">
                    <label>Tip Aukcije</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px;">
                        <div class="auction-type-option" onclick="selectAuctionType('classic')" id="typeClassic" style="background:linear-gradient(135deg,rgba(108,92,231,0.1),rgba(0,217,255,0.1));border:3px solid var(--primary);padding:20px;border-radius:12px;cursor:pointer;text-align:center;transition:all 0.3s;">
                            <div style="font-size:2.5rem;margin-bottom:8px;">🔥</div>
                            <div style="font-weight:700;font-size:0.9rem;margin-bottom:5px;">Klasična</div>
                            <div style="font-size:0.75rem;color:var(--text-muted);">Ponude ↗️</div>
                        </div>
                        <div class="auction-type-option" onclick="selectAuctionType('reverse')" id="typeReverse" style="background:var(--bg-secondary);border:2px solid var(--border-color);padding:20px;border-radius:12px;cursor:pointer;text-align:center;transition:all 0.3s;">
                            <div style="font-size:2.5rem;margin-bottom:8px;">💎</div>
                            <div style="font-weight:700;font-size:0.9rem;margin-bottom:5px;">Obrnuta</div>
                            <div style="font-size:0.75rem;color:var(--text-muted);">Ponude ↘️</div>
                        </div>
                    </div>
                    <input type="hidden" id="auctionType" value="classic" required>
                </div>

                <div class="form-group">
                    <label>Kategorija</label>
                    <select required id="createCategory">
                        <option value="">Izaberite kategoriju</option>
                        <option value="automobili">🚗 Automobili</option>
                        <option value="nekretnine">🏠 Nekretnine</option>
                        <option value="namjestaj">🪑 Namještaj</option>
                        <option value="tehnika">⚡ Tehnika</option>
                        <option value="alati">🔧 Alati</option>
                        <option value="telefoni">📱 Telefoni</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Naslov</label>
                    <input type="text" required id="createTitle" maxlength="100" placeholder="Unesite naslov aukcije">
                </div>

                <div class="form-group">
                    <label>Opis</label>
                    <textarea required id="createDescription" rows="5" maxlength="2000" placeholder="Detaljan opis proizvoda..."></textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label id="priceLabel">Početna cijena (€)</label>
                        <input type="number" required id="createPrice" min="1" step="0.01" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Trajanje (sati)</label>
                        <input type="number" required id="createDuration" min="1" max="168" value="24">
                    </div>
                </div>

                <div class="form-group" id="minPriceGroup" style="display:none;">
                    <label>Minimalna prihvatljiva cijena (€)</label>
                    <input type="number" id="createMinPrice" min="1" step="0.01" placeholder="Najniža cijena koju prihvatate">
                    <small style="color:var(--text-muted);font-size:0.85rem;">Ponude ispod ove cijene neće biti prikazane</small>
                </div>

                <div class="form-group">
                    <label>Lokacija</label>
                    <input type="text" required id="createLocation" placeholder="Grad">
                </div>

                <div class="form-group">
                    <label>Slike (maksimum 10)</label>
                    <div class="upload-zone" id="uploadZone">
                        <div class="upload-icon">📸</div>
                        <p class="upload-text">Kliknite ili prevucite slike ovdje</p>
                        <p class="upload-subtext">JPG, PNG ili WEBP (max 10 slika)</p>
                        <input type="file" id="fileInput" multiple accept="image/jpeg,image/jpg,image/png,image/webp" style="display:none;">
                    </div>
                    <div class="preview-grid" id="previewGrid"></div>
                    <div class="image-counter" id="imageCounter">0/10 slika</div>
                </div>

                <button type="submit" class="btn btn-primary btn-large">Objavi Aukciju</button>
            </form>
        </div>
    `;
};

// ODOBRILI SMO DUGAČAK OUTPUT - NASTAVLJA SE...


App.renderMyAuctionsPage = function() {
    return `
        <div class="page-container">
            <h1 class="page-title">Moji Oglasi</h1>
            <div id="myAuctionsList">
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;
};

App.renderFavoritesPage = function() {
    const favoriteAuctions = allAuctions.filter(a => userFavorites.includes(a.id));
    
    return `
        <div class="page-container">
            <h1 class="page-title">Omiljene Aukcije</h1>
            <div class="auctions-grid">
                ${favoriteAuctions.length > 0 ? this.renderAuctions(favoriteAuctions) : '<div class="empty-state"><p>Nemate omiljenih aukcija</p></div>'}
            </div>
        </div>
    `;
};

App.renderProfilePage = function() {
    if (!currentUser) return '<div class="error-page"><p>Morate biti prijavljeni</p></div>';
    
    return `
        <div class="page-container">
            <div class="profile-header">
                <div class="profile-avatar-large">
                    ${currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <h1 class="profile-name">${currentUser.displayName || 'Korisnik'}</h1>
                <p class="profile-email">${currentUser.email}</p>
            </div>

            <div class="profile-stats">
                <div class="stat-card">
                    <div class="stat-value">0</div>
                    <div class="stat-label">Aukcija</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">0</div>
                    <div class="stat-label">Ponuda</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">5.0</div>
                    <div class="stat-label">Ocjena</div>
                </div>
            </div>

            <div class="profile-actions">
                <button class="btn btn-outline" onclick="openModal('editProfile')">Uredi Profil</button>
                <button class="btn btn-outline" onclick="logout()">Odjavi se</button>
            </div>
        </div>
    `;
};

App.renderVIPPage = function() {
    return `
        <div class="page-container">
            <div class="pricing-card vip-card">
                <div class="pricing-badge">VIP</div>
                <h1 class="pricing-title">VIP Status</h1>
                <div class="pricing-price">30€<span class="pricing-period">/30 dana</span></div>
                <ul class="pricing-features">
                    <li>✓ Zlatni VIP bedž uz ime</li>
                    <li>✓ Neograničen broj oglasa</li>
                    <li>✓ Prioritet u pretrazi</li>
                    <li>✓ Premium podrška 24/7</li>
                    <li>✓ Automatski renewal</li>
                    <li>✓ Specijalne promocije</li>
                </ul>
                <button class="btn btn-vip" onclick="contactForPayment('VIP')">Postani VIP</button>
                <p class="pricing-note">Kontakt: +382 63 493 850</p>
            </div>
        </div>
    `;
};

App.renderPremiumPage = function() {
    return `
        <div class="page-container">
            <div class="pricing-card premium-card">
                <div class="pricing-badge">PREMIUM</div>
                <h1 class="pricing-title">Premium Oglas</h1>
                <div class="pricing-price">10€<span class="pricing-period">/10 dana</span></div>
                <ul class="pricing-features">
                    <li>✓ Istaknut na vrhu liste</li>
                    <li>✓ Premium bedž</li>
                    <li>✓ 5x više pregleda</li>
                    <li>✓ Poseban dizajn kartice</li>
                    <li>✓ Email notifikacije</li>
                    <li>✓ Analitika oglasa</li>
                </ul>
                <button class="btn btn-premium" onclick="contactForPayment('Premium')">Unaprijedi Oglas</button>
                <p class="pricing-note">Kontakt: +382 63 493 850</p>
            </div>
        </div>
    `;
};

App.renderChatPage = function() {
    return `
        <div class="page-container">
            <h1 class="page-title">Chat Podrška</h1>
            <div class="contact-card">
                <h3>Kontaktirajte nas</h3>
                <p>Za direktnu komunikaciju, pitanja i žalbe:</p>
                <div class="contact-methods">
                    <a href="viber://chat?number=38263493850" class="contact-method">
                        <span class="contact-icon">📱</span>
                        <span class="contact-text">+382 63 493 850</span>
                    </a>
                    <a href="mailto:support@eaukcija.me" class="contact-method">
                        <span class="contact-icon">📧</span>
                        <span class="contact-text">support@eaukcija.me</span>
                    </a>
                </div>
                <p class="contact-hours">Radno vrijeme: Pon-Pet 09:00-17:00</p>
            </div>
        </div>
    `;
};

App.renderSuggestionsPage = function() {
    return `
        <div class="page-container">
            <h1 class="page-title">Vaše Sugestije</h1>
            <form class="suggestion-form" onsubmit="handleSuggestion(event)">
                <p>Pomozite nam da poboljšamo platformu. Vaše mišljenje je važno!</p>
                <textarea id="suggestionText" rows="6" placeholder="Opišite vašu sugestiju..." required></textarea>
                <button type="submit" class="btn btn-primary">Pošalji Sugestiju</button>
            </form>
        </div>
    `;
};

App.renderDonationsPage = function() {
    return `
        <div class="page-container">
            <h1 class="page-title">Podržite Sistem</h1>
            <div class="donation-card">
                <p>Vaša donacija pomaže razvoju i održavanju platforme.</p>
                <div class="donation-amounts">
                    <button class="amount-btn" onclick="selectDonation(5)">5€</button>
                    <button class="amount-btn" onclick="selectDonation(10)">10€</button>
                    <button class="amount-btn" onclick="selectDonation(20)">20€</button>
                    <button class="amount-btn" onclick="selectDonation(50)">50€</button>
                </div>
                <input type="number" id="customDonation" placeholder="Ili unesite iznos..." min="1" class="custom-input">
                <button class="btn btn-accent" onclick="processDonation()">❤️ Doniraj</button>
            </div>
        </div>
    `;
};

App.renderRewardsPage = function() {
    return `
        <div class="page-container">
            <h1 class="page-title">Program Nagrada</h1>
            <div class="rewards-card">
                <div class="reward-icon">🏆</div>
                <h2>Vaš Activity Score</h2>
                <div class="reward-score" id="activityScore">0</div>
                <p>+1 bod za svaku objavljenu aukciju<br>+1 bod za svaku ponudu</p>
            </div>
            <div class="rewards-list">
                <h3>Mjesečne Nagrade:</h3>
                <div class="reward-item">🥇 Top Prodavac - VIP gratis</div>
                <div class="reward-item">🥈 Top Kupac - 50% popust na Premium</div>
                <div class="reward-item">🥉 Najaktivniji - Specijalni bedž</div>
            </div>
        </div>
    `;
};

App.renderTermsPage = function() {
    return `
        <div class="page-container terms-page">
            <h1 class="page-title">Uslovi Korišćenja i Pravila</h1>
            <div class="terms-content">
                <h3>1. OPŠTI USLOVI</h3>
                <p>Korišćenjem eAukcija.me platforme prihvatate sledeće uslove.</p>

                <h3>2. REGISTRACIJA</h3>
                <p>• Morate biti stariji od 18 godina<br>
                • Obavezni ste dati tačne podatke<br>
                • Email adresa mora biti validna</p>

                <h3>3. PRAVILA OGLAŠAVANJA</h3>
                <p>• Svi oglasi moraju biti istiniti<br>
                • Slike moraju odgovarati proizvodu<br>
                • Zabranjeno oglašavanje ilegalnih proizvoda</p>

                <h3>4. AUKCIJE</h3>
                <p>• Sve ponude su obavezujuće<br>
                • Pobjednik mora kontaktirati prodavca<br>
                • eAukcija.me nije odgovorna za transakcije</p>

                <h3>5. VIP I PREMIUM</h3>
                <p>• VIP: 30€ za 30 dana<br>
                • Premium: 10€ za 10 dana<br>
                • Plaćanja nisu refundabilna</p>

                <h3>6. ZABRANJENO</h3>
                <p>• Spam i zloupotreba<br>
                • Prevare<br>
                • Uvredljiv sadržaj<br>
                • Kršenje zakona</p>

                <h3>7. PRIVATNOST</h3>
                <p>Vaši podaci su sigurni (Firebase) i ne dijele se bez dozvole.</p>

                <h3>8. KONTAKT</h3>
                <p>📧 support@eaukcija.me<br>📱 +382 63 493 850</p>
            </div>
        </div>
    `;
};

App.renderPrivacyPage = function() {
    return `
        <div class="page-container terms-page">
            <h1 class="page-title">Politika Privatnosti</h1>
            <div class="terms-content">
                <h3>1. PODACI KOJE PRIKUPLJAMO</h3>
                <p>Ime, email, telefon, IP adresa, aktivnost na platformi.</p>

                <h3>2. KORIŠĆENJE PODATAKA</h3>
                <p>Za nalog, oglase, komunikaciju, poboljšanje usluge.</p>

                <h3>3. DIJELJENJE</h3>
                <p>Firebase (EU serveri). Ne prodajemo podatke trećim stranama.</p>

                <h3>4. SIGURNOST</h3>
                <p>SSL enkripcija, Firebase Security Rules.</p>

                <h3>5. VAŠA PRAVA (GDPR)</h3>
                <p>Pristup, ispravka, brisanje, prigovor, prenosivost.</p>
            </div>
        </div>
    `;
};

App.renderAdminPage = function() {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        return '<div class="error-page"><p>Nemate pristup</p></div>';
    }
    
    return `
        <div class="page-container">
            <h1 class="page-title">Admin Panel</h1>
            <div class="admin-tabs">
                <button class="admin-tab active" onclick="loadAdminTab('pending')">Na Odobrenju</button>
                <button class="admin-tab" onclick="loadAdminTab('all')">Sve Aukcije</button>
                <button class="admin-tab" onclick="loadAdminTab('users')">Korisnici</button>
            </div>
            <div id="adminContent">
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;
};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function toggleMenu(force) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (force === false) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    } else {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    document.getElementById('themeIcon').textContent = newTheme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('theme', newTheme);
}

function toggleNotifications() {
    App.showToast('Notifikacije dolaze uskoro!', 'info');
}

function installApp() {
    if (installPromptEvent) {
        installPromptEvent.prompt();
        installPromptEvent.userChoice.then(choice => {
            if (choice.outcome === 'accepted') {
                App.showToast('Aplikacija instalirana!', 'success');
            }
            installPromptEvent = null;
        });
    }
    closeInstall();
}

function closeInstall() {
    document.getElementById('installPrompt').style.display = 'none';
    localStorage.setItem('installDismissed', 'true');
}

function showAllAuctions() {
    currentCategory = 'all';
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
    event.target.classList.add('active');
    
    const grid = document.getElementById('allAuctionsGrid');
    if (grid) {
        grid.innerHTML = App.renderAuctions(allAuctions);
    }
}

function filterByCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
    event.target.classList.add('active');
    
    if (cat === 'all') {
        navigateTo('auctions');
    } else {
        navigateTo('auctions');
        setTimeout(() => {
            const filtered = allAuctions.filter(a => a.kategorija === cat);
            document.getElementById('allAuctionsGrid').innerHTML = App.renderAuctions(filtered);
        }, 100);
    }
}

function filterCategory(cat) {
    currentCategory = cat;
    
    // Filter home auctions
    const homeGrid = document.getElementById('homeAuctions');
    if (homeGrid) {
        const filtered = allAuctions.filter(a => a.kategorija === cat);
        homeGrid.innerHTML = App.renderAuctions(filtered.slice(0, 6));
    }
    
    // Highlight selected category
    document.querySelectorAll('.category-card').forEach(card => {
        card.style.borderColor = 'var(--border-color)';
        card.style.background = 'var(--bg-secondary)';
    });
    
    event.target.closest('.category-card').style.borderColor = 'var(--primary)';
    event.target.closest('.category-card').style.background = 'rgba(108, 92, 231, 0.1)';
}

async function toggleFavorite(event, auctionId) {
    event.stopPropagation();
    
    if (!currentUser) {
        App.showToast('Prijavite se da sačuvate favorite!', 'warning');
        return;
    }

    const index = userFavorites.indexOf(auctionId);
    if (index > -1) {
        userFavorites.splice(index, 1);
    } else {
        userFavorites.push(auctionId);
    }

    try {
        await db.collection('users').doc(currentUser.uid).update({
            favorites: userFavorites
        });
        
        event.target.closest('.favorite-btn').classList.toggle('active');
        event.target.textContent = userFavorites.includes(auctionId) ? '❤️' : '🤍';
    } catch (error) {
        App.showToast('Greška pri čuvanju', 'error');
    }
}

function openModal(type, mode) {
    const container = document.getElementById('modalContainer');
    
    if (type === 'auth') {
        container.innerHTML = `
            <div class="modal active" onclick="closeModalOnOverlay(event)">
                <div class="modal-content">
                    <button class="modal-close" onclick="closeModal()">×</button>
                    <h2 class="modal-title">${mode === 'login' ? 'Prijava' : 'Registracija'}</h2>
                    <form class="auth-form" onsubmit="handleAuth(event, '${mode}')">
                        <input type="email" id="authEmail" placeholder="Email adresa" required>
                        <input type="password" id="authPassword" placeholder="Lozinka (min 6)" required>
                        ${mode === 'register' ? `
                            <input type="text" id="authName" placeholder="Ime i Prezime" required>
                            <input type="tel" id="authPhone" placeholder="Telefon (+382)" required>
                        ` : `
                            <a href="#" onclick="resetPassword()" class="forgot-link">Zaboravljena lozinka?</a>
                        `}
                        <button type="submit" class="btn btn-primary">
                            ${mode === 'login' ? 'Prijavi se' : 'Registruj se'}
                        </button>
                    </form>
                    <p class="auth-toggle">
                        ${mode === 'login' ? 'Nemate nalog?' : 'Već imate nalog?'}
                        <a href="#" onclick="openModal('auth', '${mode === 'login' ? 'register' : 'login'}')">
                            ${mode === 'login' ? 'Registrujte se' : 'Prijavite se'}
                        </a>
                    </p>
                </div>
            </div>
        `;
    }
}

function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
}

function closeModalOnOverlay(event) {
    if (event.target.classList.contains('modal')) {
        closeModal();
    }
}

async function handleAuth(event, mode) {
    event.preventDefault();
    
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    try {
        if (mode === 'register') {
            const name = document.getElementById('authName').value.trim();
            const phone = document.getElementById('authPhone').value.trim();

            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: name });
            
            await db.collection('users').doc(userCredential.user.uid).set({
                name, phone, email,
                createdAt: Date.now(),
                isVIP: false,
                verified: false,
                activityScore: 0,
                favorites: [],
                rating: 5
            });

            await userCredential.user.sendEmailVerification();
            
            App.showToast('Registracija uspješna! Provjerite email.', 'success');
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            App.showToast('Uspješno ste prijavljeni!', 'success');
        }
        
        closeModal();
    } catch (error) {
        let message = 'Greška: ';
        if (error.code === 'auth/email-already-in-use') message = 'Email već postoji!';
        else if (error.code === 'auth/weak-password') message = 'Lozinka mora imati min 6 karaktera!';
        else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = 'Pogrešan email ili lozinka!';
        } else message = error.message;
        
        App.showToast(message, 'error');
    }
}

function resetPassword() {
    const email = prompt('Unesite vašu email adresu:');
    if (!email) return;
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            App.showToast('Link za reset poslat na email!', 'success');
        })
        .catch(error => {
            App.showToast('Greška: ' + error.message, 'error');
        });
}

function logout() {
    if (confirm('Da li ste sigurni?')) {
        auth.signOut();
        App.showToast('Odjavljeni ste', 'info');
        navigateTo('home');
    }
}

function contactForPayment(type) {
    App.showToast(`Kontaktirajte: +382 63 493 850 za ${type} plaćanje`, 'info');
}

// ═══════════════════════════════════════════════════════════════════
// FILE UPLOAD FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) {
        console.log('Nema odabranih slika');
        return;
    }
    
    const files = Array.from(fileList).slice(0, 10);
    selectedFiles = files;
    
    const previewGrid = document.getElementById('previewGrid');
    const imageCounter = document.getElementById('imageCounter');
    
    if (!previewGrid) return;
    
    previewGrid.innerHTML = '';
    
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.style.cssText = 'position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;border:2px solid var(--border-color);';
            div.innerHTML = `
                <img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">
                <button onclick="removeFile(${index})" type="button" style="position:absolute;top:4px;right:4px;background:var(--accent);color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-weight:700;">×</button>
            `;
            previewGrid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
    
    if (imageCounter) {
        imageCounter.textContent = `${files.length}/10 slika`;
        imageCounter.style.color = files.length > 0 ? 'var(--success)' : 'var(--text-muted)';
    }
    
    App.showToast(`${files.length} ${files.length === 1 ? 'slika' : 'slika'} odabrano`, 'success');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    handleFiles(selectedFiles);
}

function selectAuctionType(type) {
    document.getElementById('auctionType').value = type;
    
    const classicCard = document.getElementById('typeClassic');
    const reverseCard = document.getElementById('typeReverse');
    const priceLabel = document.getElementById('priceLabel');
    const minPriceGroup = document.getElementById('minPriceGroup');
    
    if (type === 'classic') {
        classicCard.style.background = 'linear-gradient(135deg,rgba(108,92,231,0.1),rgba(0,217,255,0.1))';
        classicCard.style.border = '3px solid var(--primary)';
        reverseCard.style.background = 'var(--bg-secondary)';
        reverseCard.style.border = '2px solid var(--border-color)';
        priceLabel.textContent = 'Početna cijena (€)';
        minPriceGroup.style.display = 'none';
    } else {
        reverseCard.style.background = 'linear-gradient(135deg,rgba(255,51,102,0.1),rgba(255,165,0,0.1))';
        reverseCard.style.border = '3px solid var(--accent)';
        classicCard.style.background = 'var(--bg-secondary)';
        classicCard.style.border = '2px solid var(--border-color)';
        priceLabel.textContent = 'Početna cijena (visoka)';
        minPriceGroup.style.display = 'block';
    }
}

async function handleCreateAuction(event) {
    event.preventDefault();
    
    if (!currentUser) {
        App.showToast('Morate biti prijavljeni!', 'warning');
        openModal('auth', 'login');
        return;
    }
    
    const auctionType = document.getElementById('auctionType').value;
    const category = document.getElementById('createCategory').value;
    const title = document.getElementById('createTitle').value.trim();
    const description = document.getElementById('createDescription').value.trim();
    const price = document.getElementById('createPrice').value;
    const duration = document.getElementById('createDuration').value;
    const location = document.getElementById('createLocation').value.trim();
    const minPrice = document.getElementById('createMinPrice')?.value;
    
    if (!category || !title || !description || !price || !location) {
        App.showToast('Popunite sva polja!', 'warning');
        return;
    }
    
    if (selectedFiles.length === 0) {
        App.showToast('Dodajte barem 1 sliku!', 'warning');
        return;
    }
    
    try {
        App.showToast('Objavljujem aukciju...', 'info');
        
        // Convert images to base64
        const images = [];
        for (const file of selectedFiles) {
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            images.push(base64);
        }
        
        // Get user data
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data() || {};
        
        const endTime = Date.now() + (Number(duration) * 60 * 60 * 1000);
        
        // Create auction
        await db.collection('aukcije').add({
            auctionType: auctionType,
            kategorija: category,
            naslov: title,
            opis: description,
            cijena: Number(price),
            minPrice: minPrice ? Number(minPrice) : null,
            lokacija: location,
            slike: images,
            timestamp: Date.now(),
            endTime: endTime,
            userId: currentUser.uid,
            userName: userData.name || currentUser.displayName || 'Korisnik',
            userPhone: userData.phone || '',
            verified: userData.verified || false,
            isVIP: userData.isVIP || false,
            rating: userData.rating || 5,
            bids: [],
            views: 0,
            active: true
        });
        
        // Update user activity score
        await db.collection('users').doc(currentUser.uid).update({
            activityScore: (userData.activityScore || 0) + 1
        });
        
        const typeText = auctionType === 'classic' ? 'Klasična' : 'Obrnuta';
        App.showToast(`✅ ${typeText} aukcija uspješno objavljena!`, 'success');
        
        // Reset form
        selectedFiles = [];
        document.getElementById('auctionType').value = 'classic';
        document.getElementById('createCategory').value = '';
        document.getElementById('createTitle').value = '';
        document.getElementById('createDescription').value = '';
        document.getElementById('createPrice').value = '';
        document.getElementById('createDuration').value = '24';
        document.getElementById('createLocation').value = '';
        if (document.getElementById('createMinPrice')) {
            document.getElementById('createMinPrice').value = '';
        }
        document.getElementById('previewGrid').innerHTML = '';
        document.getElementById('imageCounter').textContent = '0/10 slika';
        selectAuctionType('classic');
        
        navigateTo('auctions');
    } catch (error) {
        console.error('Greška:', error);
        App.showToast('❌ Greška pri objavljivanju: ' + error.message, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

console.log('🚀 eAukcija.me PWA - Profesionalna verzija 2.0');