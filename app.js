// ========================================
// eAUKCIJA.me - RADNA VERZIJA
// ========================================

console.log('🚀 eAukcija.me starting...');

// ========================================
// CLOSE MODAL - MOBILE OPTIMIZED!
// ========================================

window.closeModal = function() {
    console.log('❌ X BUTTON TOUCHED/CLICKED!');
    const modal = document.getElementById('modalContainer');
    if (modal) {
        modal.innerHTML = '';
        console.log('✅ MODAL REMOVED!');
    }
    document.body.style.overflow = 'auto';
    document.body.style.position = '';
    document.body.style.height = '';
};

// Mobile touch support
document.addEventListener('touchstart', function(e) {
    if (e.target.classList.contains('modal-close')) {
        console.log('📱 TOUCH on X button!');
        e.preventDefault();
        e.stopPropagation();
        window.closeModal();
    }
}, { passive: false });

console.log('✅ closeModal ready (MOBILE)');

// ========================================
// FIREBASE CONFIG
// ========================================

const firebaseConfig = {
    apiKey: "AIzaSyDNRI9Rk7CjckhSeFngeEwzxheNl4EwhE4",
    authDomain: "eaukcija-cfed6.firebaseapp.com",
    projectId: "eaukcija-cfed6",
    storageBucket: "eaukcija-cfed6.firebasestorage.app"
};

const ADMIN_EMAIL = "radomirkuc2@gmail.com";

// GLOBALS
let db, auth;
let currentUser = null;
let allAuctions = [];
let selectedFiles = [];
let currentPage = 'home';

// ========================================
// GLOBAL HELPERS
// ========================================

function handleImageError(img) {
    console.log('⚠️ Image failed to load');
    img.onerror = null;
    img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%231A1F38%22 width=%22400%22 height=%22300%22/%3E%3Ctext fill=%22%236C5CE7%22 font-family=%22Arial%22 font-size=%2220%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E📸%3C/text%3E%3C/svg%3E';
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready');
    
    // Hide splash after 3 seconds (longer)
    setTimeout(() => {
        document.getElementById('splashScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        console.log('App shown');
    }, 3000);
    
    // Init Firebase
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            
            auth.onAuthStateChanged(user => {
                currentUser = user;
                updateAuthButton();
                console.log('User:', user ? user.email : 'not logged in');
            });
            
            loadAuctions();
            console.log('Firebase initialized');
        } catch (err) {
            console.error('Firebase error:', err);
        }
    }
    
    // Show home page
    showPage('home');
});

// ========================================
// AUTH
// ========================================

function updateAuthButton() {
    const btn = document.getElementById('authButton');
    if (currentUser) {
        btn.textContent = 'Odjava';
        btn.onclick = () => {
            auth.signOut();
            showToast('Odjavljeni ste');
        };
    } else {
        btn.textContent = 'Prijava';
        btn.onclick = () => openAuthModal('login');
    }
}

function openAuthModal(mode) {
    const container = document.getElementById('modalContainer');
    container.innerHTML = `
        <div class="modal active" id="modalOverlay" onclick="closeModalOnOverlay(event)">
            <div class="modal-content">
                <button class="modal-close" onclick="window.closeModal(); return false;" ontouchstart="window.closeModal(); return false;">×</button>
                <h2 class="modal-title">${mode === 'login' ? 'Prijava' : 'Registracija'}</h2>
                <form onsubmit="handleAuth(event, '${mode}')">
                    <div class="form-group">
                        <input type="email" id="authEmail" placeholder="Email adresa" required>
                    </div>
                    <div class="form-group">
                        <input type="password" id="authPassword" placeholder="Lozinka (min 6 karaktera)" required>
                    </div>
                    ${mode === 'login' ? `
                        <div style="text-align:right;margin-top:-10px;margin-bottom:15px;">
                            <a href="#" onclick="resetPassword(); return false;" style="color:#6C5CE7;font-size:0.85rem;text-decoration:none;">
                                Zaboravili ste lozinku?
                            </a>
                        </div>
                    ` : ''}
                    ${mode === 'register' ? `
                        <div class="form-group">
                            <input type="text" id="authName" placeholder="Ime i Prezime" required>
                        </div>
                        <div class="form-group">
                            <input type="tel" id="authPhone" placeholder="Telefon (+382...)" required>
                        </div>
                    ` : ''}
                    <button type="submit" class="btn-submit">
                        ${mode === 'login' ? 'Prijavi se' : 'Registruj se'}
                    </button>
                </form>
                <p style="text-align:center;margin-top:15px;font-size:0.9rem;">
                    ${mode === 'login' ? 'Nemate nalog?' : 'Već imate nalog?'}
                    <a href="#" onclick="openAuthModal('${mode === 'login' ? 'register' : 'login'}'); return false;" style="color:#6C5CE7;font-weight:700;">
                        ${mode === 'login' ? 'Registrujte se' : 'Prijavite se'}
                    </a>
                </p>
            </div>
        </div>
    `;
}

function closeModalOnOverlay(event) {
    if (event.target.id === 'modalOverlay' || 
        event.target.classList.contains('modal')) {
        console.log('🖱️ Clicked on overlay');
        window.closeModal();
    }
}

// ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        console.log('🔑 ESC pressed');
        window.closeModal();
    }
});

async function handleAuth(event, mode) {
    event.preventDefault();
    
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    
    try {
        if (mode === 'register') {
            const name = document.getElementById('authName').value.trim();
            const phone = document.getElementById('authPhone').value.trim();
            
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            await cred.user.updateProfile({ displayName: name });
            
            await db.collection('users').doc(cred.user.uid).set({
                name, phone, email,
                createdAt: Date.now(),
                favorites: [],
                activityScore: 0
            });
            
            showToast('✅ Uspješna registracija!');
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('✅ Uspješna prijava!');
        }
        
        closeModal();
    } catch (err) {
        let msg = 'Greška: ' + err.message;
        if (err.code === 'auth/email-already-in-use') msg = 'Email već postoji!';
        else if (err.code === 'auth/weak-password') msg = 'Lozinka mora imati min 6 karaktera!';
        else if (err.code === 'auth/user-not-found') msg = 'Korisnik nije pronađen!';
        else if (err.code === 'auth/wrong-password') msg = 'Pogrešna lozinka!';
        
        showToast(msg, 'error');
    }
}

// ========================================
// PASSWORD RESET
// ========================================

function resetPassword() {
    const container = document.getElementById('modalContainer');
    container.innerHTML = `
        <div class="modal active" id="modalOverlay" onclick="closeModalOnOverlay(event)">
            <div class="modal-content">
                <button class="modal-close" onclick="window.closeModal(); return false;" ontouchstart="window.closeModal(); return false;">×</button>
                <h2 class="modal-title">🔑 Reset Lozinke</h2>
                <p style="margin-bottom:20px;color:#888;">Unesite vaš email i poslat ćemo vam link za reset lozinke.</p>
                <form onsubmit="sendPasswordReset(event)">
                    <div class="form-group">
                        <input type="email" id="resetEmail" placeholder="Vaš email" required>
                    </div>
                    <button type="submit" class="btn-submit">Pošalji Link</button>
                </form>
                <p style="text-align:center;margin-top:15px;font-size:0.9rem;">
                    <a href="#" onclick="openAuthModal('login'); return false;" style="color:#6C5CE7;">
                        ← Nazad na prijavu
                    </a>
                </p>
            </div>
        </div>
    `;
}

async function sendPasswordReset(event) {
    event.preventDefault();
    
    const email = document.getElementById('resetEmail').value.trim();
    
    try {
        await auth.sendPasswordResetEmail(email);
        showToast('✅ Email za reset lozinke je poslan! Provjerite inbox.');
        closeModal();
    } catch (err) {
        let msg = 'Greška: ' + err.message;
        if (err.code === 'auth/user-not-found') msg = 'Email nije pronađen!';
        showToast(msg, 'error');
    }
}

// ========================================
// NAVIGATION
// ========================================

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

function showPage(page) {
    console.log('Showing page:', page);
    currentPage = page;
    
    // Close sidebar
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    
    // Update bottom nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === page) {
            btn.classList.add('active');
        }
    });
    
    // Render page
    const content = document.getElementById('mainContent');
    
    if (page === 'home') {
        content.innerHTML = `
            <!-- SEARCH BAR -->
            <div class="search-bar">
                <input type="text" id="searchInput" placeholder="🔍 Pretraži aukcije..." onkeyup="searchAuctions()">
                
                <!-- Sort Options -->
                <div style="display:flex;gap:10px;margin-top:10px;align-items:center;flex-wrap:wrap;">
                    <span style="color:#888;font-size:0.9rem;">Sortiraj:</span>
                    <select id="sortSelect" onchange="searchAuctions()" style="background:#1A1F38;border:2px solid #2A3150;color:white;padding:8px 12px;border-radius:8px;font-size:0.9rem;">
                        <option value="newest">Najnoviji</option>
                        <option value="price_low">Cijena: Niža → Viša</option>
                        <option value="price_high">Cijena: Viša → Niža</option>
                        <option value="ending_soon">Uskoro završava</option>
                        <option value="most_bids">Najviše ponuda</option>
                    </select>
                </div>
                
                <div class="category-filters" id="categoryFilters">
                    <button class="filter-chip active" onclick="filterByCategory('all')">Sve</button>
                    <button class="filter-chip" onclick="filterByCategory('automobili')">🚗 Auto</button>
                    <button class="filter-chip" onclick="filterByCategory('nekretnine')">🏠 Nekretnine</button>
                    <button class="filter-chip" onclick="filterByCategory('telefoni')">📱 Telefoni</button>
                    <button class="filter-chip" onclick="filterByCategory('namjestaj')">🪑 Namještaj</button>
                    <button class="filter-chip" onclick="filterByCategory('bijela_tehnika')">❄️ Tehnika</button>
                    <button class="filter-chip" onclick="filterByCategory('alati')">🔧 Alati</button>
                </div>
            </div>
            
            <!-- HERO BANNER -->
            <div class="hero-banner">
                <div class="hero-icon">🔨</div>
                <h2 class="hero-title">Dodaj Svoju Aukciju <span style="color:#00E396;">BESPLATNO</span></h2>
                <p class="hero-text">
                    Priključi se kupovini putem aukcije! Ponudi nižu ili višu cijenu - možda si baš ti srećni kupac! 
                    Brzo, jednostavno i sigurno.
                </p>
                <button onclick="showPage('create')" class="hero-btn">
                    ➕ Dodaj Oglas Odmah
                </button>
                <div class="hero-features">
                    <div class="hero-feature">
                        <span class="hero-feature-icon">✅</span>
                        <span>Potpuno besplatno</span>
                    </div>
                    <div class="hero-feature">
                        <span class="hero-feature-icon">⚡</span>
                        <span>Brza objava</span>
                    </div>
                    <div class="hero-feature">
                        <span class="hero-feature-icon">🔒</span>
                        <span>Sigurno i provjereno</span>
                    </div>
                </div>
            </div>
            
            <h1 class="page-title">Aktivne Aukcije</h1>
            <div class="auctions-grid" id="auctionsGrid"></div>
        `;
        renderAuctions();
    }
    
    else if (page === 'create') {
        if (!currentUser) {
            showToast('Morate biti prijavljeni!');
            openAuthModal('login');
            return;
        }
        
        // Reset selected files
        selectedFiles = [];
        
        content.innerHTML = `
            <h1 class="page-title">Dodaj Oglas</h1>
            <form onsubmit="createAuction(event)">
                <div class="form-group">
                    <label>Kategorija</label>
                    <select id="category" required>
                        <option value="">Izaberite kategoriju</option>
                        <option value="automobili">🚗 Automobili</option>
                        <option value="nekretnine">🏠 Nekretnine</option>
                        <option value="telefoni">📱 Telefoni</option>
                        <option value="namjestaj">🪑 Namještaj</option>
                        <option value="bijela_tehnika">❄️ Bijela Tehnika</option>
                        <option value="alati">🔧 Alati</option>
                        <option value="ostalo">📦 Ostalo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Naslov</label>
                    <input type="text" id="title" maxlength="100" required placeholder="Unesite naslov oglasa">
                </div>
                
                <div class="form-group">
                    <label>Opis</label>
                    <textarea id="description" rows="5" maxlength="2000" required placeholder="Detaljan opis proizvoda..."></textarea>
                </div>
                
                <div class="form-group">
                    <label>Cijena (€)</label>
                    <input type="number" id="price" min="1" step="0.01" required placeholder="0.00">
                </div>
                
                <div class="form-group">
                    <label>Lokacija</label>
                    <input type="text" id="location" required placeholder="Grad">
                </div>
                
                <div class="form-group">
                    <label>Slike (max 10)</label>
                    
                    <!-- BIG VISUAL GUIDE -->
                    <div style="background:linear-gradient(135deg,#6C5CE7,#FF3366);padding:20px;border-radius:15px;margin-bottom:20px;text-align:center;">
                        <div style="font-size:3rem;margin-bottom:10px;">📸</div>
                        <h3 style="margin-bottom:15px;font-size:1.3rem;">VAŽNO: Kako dodati više slika</h3>
                        <div style="background:rgba(0,0,0,0.3);padding:15px;border-radius:10px;text-align:left;">
                            <p style="margin:8px 0;font-weight:700;">📱 <strong>ANDROID:</strong></p>
                            <p style="margin:5px 0;padding-left:20px;">1. Klikni "DODAJ SLIKE" dugme</p>
                            <p style="margin:5px 0;padding-left:20px;">2. <strong>DRŽI PRST 2 SEKUNDE</strong> na prvoj slici</p>
                            <p style="margin:5px 0;padding-left:20px;">3. Pojavi se ✅ - sad klikaj ostale slike</p>
                            <p style="margin:5px 0;padding-left:20px;">4. Klikni "Done" ili "OK"</p>
                            <br>
                            <p style="margin:8px 0;font-weight:700;">📱 <strong>iPhone:</strong></p>
                            <p style="margin:5px 0;padding-left:20px;">1. Klikni "DODAJ SLIKE"</p>
                            <p style="margin:5px 0;padding-left:20px;">2. Klikni "Select" gore desno</p>
                            <p style="margin:5px 0;padding-left:20px;">3. Biraj slike (do 10)</p>
                            <p style="margin:5px 0;padding-left:20px;">4. Klikni "Add" ili "Done"</p>
                        </div>
                    </div>
                    
                    <button type="button" class="upload-btn-big" onclick="document.getElementById('fileInput').click()">
                        📸 DODAJ SLIKE (do 10)
                    </button>
                    
                    <input type="file" id="fileInput" multiple accept="image/*" style="display:none" onchange="handleFiles(this.files)">
                    
                    <div class="preview-grid" id="previewGrid"></div>
                    <div id="imageCounter" style="text-align:center;margin:15px 0;font-weight:700;font-size:1.2rem;color:#00E396;">0/10 slika</div>
                    
                    <button type="button" class="upload-btn-small" onclick="document.getElementById('fileInput').click()" style="display:none;" id="addMoreBtn">
                        ➕ Dodaj Još Slika
                    </button>
                </div>
                
                <button type="submit" class="btn-submit">OBJAVI OGLAS</button>
            </form>
        `;
    }
    
    else if (page === 'myAuctions') {
        if (!currentUser) {
            showToast('Morate biti prijavljeni!');
            openAuthModal('login');
            return;
        }
        
        content.innerHTML = `
            <h1 class="page-title">Moji Oglasi</h1>
            <div class="auctions-grid" id="myAuctionsGrid"></div>
        `;
        loadMyAuctions();
    }
    
    else if (page === 'watchlist') {
        if (!currentUser) {
            content.innerHTML = `
                <h1 class="page-title">👁️ Pratim</h1>
                <div class="empty-state">
                    <p style="font-size:3rem;margin-bottom:10px;">🔒</p>
                    <p>Prijavite se da pratite oglase</p>
                    <button onclick="openAuthModal('login')" class="btn-submit" style="margin-top:20px;width:auto;padding:12px 30px;">
                        Prijavi se
                    </button>
                </div>
            `;
            return;
        }
        
        content.innerHTML = `
            <h1 class="page-title">👁️ Pratim</h1>
            <div style="background:#1A1F38;padding:20px;border-radius:12px;margin-bottom:20px;">
                <h3 style="margin-bottom:10px;">💡 Šta je Watch List?</h3>
                <p style="line-height:1.7;color:#B8C1EC;">
                    Dodaj oglase koje pratiš da dobijaš notifikacije kada:
                </p>
                <ul style="margin:10px 0 0 20px;line-height:1.8;color:#B8C1EC;">
                    <li>📉 Cijena padne</li>
                    <li>💰 Neko ponudi</li>
                    <li>⏰ Aukcija uskoro završava</li>
                </ul>
            </div>
            <div class="auctions-grid" id="watchlistGrid">
                <div style="grid-column:1/-1;text-align:center;padding:40px;">
                    <div class="splash-loader" style="margin:0 auto;"></div>
                    <p style="margin-top:20px;color:#888;">Učitavam...</p>
                </div>
            </div>
        `;
        loadWatchlist();
    }
    
    else if (page === 'favorites') {
        if (!currentUser) {
            content.innerHTML = `
                <h1 class="page-title">❤️ Favoriti</h1>
                <div class="empty-state">
                    <p style="font-size:3rem;margin-bottom:10px;">🔒</p>
                    <p>Prijavite se da vidite favorite</p>
                    <button onclick="openAuthModal('login')" class="btn-submit" style="margin-top:20px;width:auto;padding:12px 30px;">
                        Prijavi se
                    </button>
                </div>
            `;
            return;
        }
        
        content.innerHTML = `
            <h1 class="page-title">❤️ Favoriti</h1>
            <div class="auctions-grid" id="favoritesGrid">
                <div style="grid-column:1/-1;text-align:center;padding:40px;">
                    <div class="splash-loader" style="margin:0 auto;"></div>
                    <p style="margin-top:20px;color:#888;">Učitavam favorite...</p>
                </div>
            </div>
        `;
        loadFavorites();
    }
    
    else if (page === 'vip') {
        content.innerHTML = `
            <h1 class="page-title">💎 VIP Paket</h1>
            <div style="max-width:500px;margin:0 auto;">
                <div style="background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,165,0,0.1));padding:30px;border-radius:15px;border:2px solid #FFD700;text-align:center;">
                    <div style="font-size:4rem;margin-bottom:15px;">💎</div>
                    <h2 style="font-size:1.8rem;margin-bottom:10px;">VIP Status</h2>
                    
                    <div style="background:#1A1F38;padding:30px;border-radius:10px;margin:20px 0;">
                        <p style="font-size:2rem;font-weight:900;color:#FFD700;margin-bottom:15px;">USKORO</p>
                        <p style="color:#888;font-size:1.1rem;">VIP paket će uskoro biti dostupan!</p>
                        <p style="color:#888;font-size:0.9rem;margin-top:15px;">
                            Pratite naše najave za specijalne benefite i povlastice.
                        </p>
                    </div>
                    
                    <div style="text-align:left;margin:20px 0;opacity:0.5;">
                        <p style="margin:8px 0;"><strong>✓</strong> Zlatni VIP bedž</p>
                        <p style="margin:8px 0;"><strong>✓</strong> Neograničen broj oglasa</p>
                        <p style="margin:8px 0;"><strong>✓</strong> Prioritet u pretrazi</p>
                        <p style="margin:8px 0;"><strong>✓</strong> Premium podrška 24/7</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    else if (page === 'premium') {
        content.innerHTML = `
            <h1 class="page-title">⭐ Premium Oglas</h1>
            <div style="max-width:500px;margin:0 auto;">
                <div style="background:linear-gradient(135deg,rgba(108,92,231,0.1),rgba(0,217,255,0.1));padding:30px;border-radius:15px;border:2px solid #6C5CE7;text-align:center;">
                    <div style="font-size:4rem;margin-bottom:15px;">⭐</div>
                    <h2 style="font-size:1.8rem;margin-bottom:10px;">Premium Oglas</h2>
                    
                    <div style="background:#1A1F38;padding:30px;border-radius:10px;margin:20px 0;">
                        <p style="font-size:2rem;font-weight:900;color:#6C5CE7;margin-bottom:15px;">USKORO</p>
                        <p style="color:#888;font-size:1.1rem;">Premium oglasi dolaze uskoro!</p>
                        <p style="color:#888;font-size:0.9rem;margin-top:15px;">
                            Istaknite svoj oglas i povećajte vidljivost.
                        </p>
                    </div>
                    
                    <div style="text-align:left;margin:20px 0;opacity:0.5;">
                        <p style="margin:8px 0;"><strong>✓</strong> Istaknut na vrhu liste</p>
                        <p style="margin:8px 0;"><strong>✓</strong> Premium bedž</p>
                        <p style="margin:8px 0;"><strong>✓</strong> 5x više pregleda</p>
                        <p style="margin:8px 0;"><strong>✓</strong> Poseban dizajn kartice</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    else if (page === 'suggestions') {
        content.innerHTML = `
            <h1 class="page-title">💡 Vaše Sugestije</h1>
            <div style="max-width:600px;margin:0 auto;">
                <p style="margin-bottom:20px;color:#888;">Pomozite nam da poboljšamo platformu. Vaše mišljenje je važno!</p>
                <form onsubmit="submitSuggestion(event)">
                    <div class="form-group">
                        <label>Vaša sugestija</label>
                        <textarea id="suggestionText" rows="6" required placeholder="Opišite vašu sugestiju ili ideju..."></textarea>
                    </div>
                    <button type="submit" class="btn-submit">Pošalji Sugestiju</button>
                </form>
            </div>
        `;
    }
    
    else if (page === 'donations') {
        content.innerHTML = `
            <h1 class="page-title">❤️ Podržite Projekat</h1>
            <div style="max-width:500px;margin:0 auto;text-align:center;">
                <div style="background:#1A1F38;padding:40px 30px;border-radius:15px;border:2px solid #2A3150;">
                    <div style="font-size:4rem;margin-bottom:20px;">❤️</div>
                    <h2 style="font-size:1.8rem;margin-bottom:15px;">Donacije</h2>
                    
                    <div style="background:#0F1629;padding:30px;border-radius:10px;margin:20px 0;">
                        <p style="font-size:2rem;font-weight:900;color:#FF3366;margin-bottom:15px;">USKORO</p>
                        <p style="color:#888;font-size:1.1rem;line-height:1.7;">
                            eAukcija.me je potpuno <strong style="color:#00E396;">BESPLATNA</strong> platforma!
                        </p>
                        <p style="color:#888;font-size:1rem;margin-top:15px;line-height:1.7;">
                            Sistem donacija će biti dostupan uskoro za one koji žele dodatno podržati razvoj platforme.
                        </p>
                    </div>
                    
                    <p style="font-size:0.9rem;color:#888;margin-top:25px;">
                        Hvala vam na podršci! 🙏
                    </p>
                </div>
            </div>
        `;
    }
    
    else if (page === 'terms') {
        content.innerHTML = `
            <h1 class="page-title">📜 Pravila i Uslovi Korišćenja</h1>
            <div style="max-width:800px;margin:0 auto;">
                <div style="background:#1A1F38;padding:30px;border-radius:15px;line-height:1.8;">
                    <h3 style="color:#6C5CE7;margin-bottom:15px;">1. Opšti uslovi</h3>
                    <p style="margin-bottom:20px;">
                        Korišćenjem eAukcija.me platforme, prihvatate ove uslove u potpunosti. 
                        Platforma je namijenjena korisnicima u Crnoj Gori za kupovinu i prodaju proizvoda putem aukcija.
                    </p>
                    
                    <h3 style="color:#6C5CE7;margin-bottom:15px;">2. Registracija i nalog</h3>
                    <p style="margin-bottom:20px;">
                        • Korisnici moraju biti stariji od 18 godina<br>
                        • Sve informacije moraju biti tačne i istinite<br>
                        • Svaki korisnik odgovoran je za sigurnost svog naloga<br>
                        • Zabranjeno je kreiranje više naloga
                    </p>
                    
                    <h3 style="color:#6C5CE7;margin-bottom:15px;">3. Pravila aukcija</h3>
                    <p style="margin-bottom:20px;">
                        • Svi proizvodi moraju biti legalni i u skladu sa zakonom<br>
                        • Zabranjena je prodaja falsifikata, ukradenih stvari ili ilegalne robe<br>
                        • Prodavac je dužan isporučiti robu u opisanom stanju<br>
                        • Ponude su obavezujuće nakon što se aukcija završi
                    </p>
                    
                    <h3 style="color:#6C5CE7;margin-bottom:15px;">4. Plaćanje i transakcije</h3>
                    <p style="margin-bottom:20px;">
                        • Plaćanje se vrši direktno između kupca i prodavca<br>
                        • Platforma ne odgovara za neispunjene transakcije<br>
                        • Preporučujemo korišćenje sigurnih metoda plaćanja<br>
                        • VIP i Premium pretplate se plaćaju kontaktiranjem admina
                    </p>
                    
                    <h3 style="color:#6C5CE7;margin-bottom:15px;">5. Zabranjeno ponašanje</h3>
                    <p style="margin-bottom:20px;">
                        • Lažno predstavljanje proizvoda<br>
                        • Spamovanje ili zloupotreba platforme<br>
                        • Uvredljivo ili nepristojno ponašanje<br>
                        • Manipulacija cijenama ili lažne ponude<br>
                        • Dijeljenje tuđih ličnih podataka
                    </p>
                    
                    <h3 style="color:#6C5CE7;margin-bottom:15px;">6. Privatnost podataka</h3>
                    <p style="margin-bottom:20px;">
                        • Vaši podaci su zaštićeni i neće biti dijeljeni sa trećim stranama<br>
                        • Koristimo Firebase autentifikaciju za sigurnost<br>
                        • Imate pravo zatražiti brisanje svog naloga
                    </p>
                    
                    <h3 style="color:#6C5CE7;margin-bottom:15px;">7. Odgovornost</h3>
                    <p style="margin-bottom:20px;">
                        • Platforma služi kao posrednik između kupaca i prodavaca<br>
                        • Ne odgovaramo za kvalitet ili autentičnost proizvoda<br>
                        • Korisnici su odgovorni za svoje transakcije<br>
                        • Platforma zadržava pravo da ukloni bilo koji oglas ili nalog
                    </p>
                    
                    <h3 style="color:#6C5CE7;margin-bottom:15px;">8. Izmjene uslova</h3>
                    <p style="margin-bottom:20px;">
                        Zadržavamo pravo da ažuriramo ove uslove. Korisnici će biti obaviješteni o značajnim promjenama.
                    </p>
                    
                    <div style="background:#0F1629;padding:20px;border-radius:10px;margin-top:30px;text-align:center;">
                        <p style="color:#888;font-size:0.9rem;">
                            Za pitanja kontaktirajte:<br>
                            <strong style="color:#00E396;">📧 radomirkuc2@gmail.com</strong><br>
                            <strong style="color:#00E396;">📞 +382 63 493 850</strong>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
    
    else if (page === 'stats') {
        content.innerHTML = `
            <h1 class="page-title">📊 Statistika Platforme</h1>
            <div style="max-width:900px;margin:0 auto;">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:30px;" id="statsCards">
                    <div style="text-align:center;padding:20px;">
                        <div class="splash-loader" style="margin:0 auto;"></div>
                        <p style="margin-top:10px;color:#888;">Učitavam...</p>
                    </div>
                </div>
                
                <div style="background:#1A1F38;padding:25px;border-radius:15px;margin-bottom:20px;">
                    <h3 style="margin-bottom:15px;">🔥 Trending Kategorije</h3>
                    <div id="trendingCategories"></div>
                </div>
                
                <div style="background:#1A1F38;padding:25px;border-radius:15px;">
                    <h3 style="margin-bottom:15px;">🏆 Top Korisnici (Najaktivniji)</h3>
                    <div id="topUsers"></div>
                </div>
            </div>
        `;
        loadStats();
    }
    
    else if (page === 'help') {
        content.innerHTML = `
            <h1 class="page-title">❓ Pomoć & FAQ</h1>
            <div style="max-width:800px;margin:0 auto;">
                <div class="faq-section">
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <span>📸 Kako dodati više slika odjednom?</span>
                            <span class="faq-icon">+</span>
                        </div>
                        <div class="faq-answer">
                            <p><strong>Android:</strong> Drži prst na prvoj slici 2 sekunde, pojave se checkboxovi, označi do 10 slika, klikni Done.</p>
                            <p><strong>iPhone:</strong> Klikni Select, označi slike, klikni Add/Done.</p>
                        </div>
                    </div>
                    
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <span>💰 Kako funkcionišu ponude?</span>
                            <span class="faq-icon">+</span>
                        </div>
                        <div class="faq-answer">
                            <p>Možeš ponuditi <strong>nižu</strong> ili <strong>višu</strong> cijenu od trenutne. Prodavac vidi sve ponude i bira najbolju za sebe.</p>
                        </div>
                    </div>
                    
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <span>⏰ Koliko traje aukcija?</span>
                            <span class="faq-icon">+</span>
                        </div>
                        <div class="faq-answer">
                            <p>Svaka aukcija traje <strong>24 sata</strong> od objave. Timer pokazuje preostalo vrijeme.</p>
                        </div>
                    </div>
                    
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <span>❤️ Šta su favoriti?</span>
                            <span class="faq-icon">+</span>
                        </div>
                        <div class="faq-answer">
                            <p>Dodaj oglase u favorite da ih lakše pronađeš kasnije. Klikni ❤️ dugme u detaljima oglasa.</p>
                        </div>
                    </div>
                    
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <span>🔗 Kako podijeliti oglas?</span>
                            <span class="faq-icon">+</span>
                        </div>
                        <div class="faq-answer">
                            <p>Otvori oglas → Klikni 🔗 Podijeli → Biraj WhatsApp, Viber, Facebook ili kopiraj link.</p>
                        </div>
                    </div>
                    
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <span>💬 Kako funkcioniše chat?</span>
                            <span class="faq-icon">+</span>
                        </div>
                        <div class="faq-answer">
                            <p>Otvori oglas → Klikni 💬 Chat → Poruke su real-time, kao WhatsApp. Prodavac dobija notifikaciju.</p>
                        </div>
                    </div>
                    
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <span>⭐ Ocjenjivanje korisnika</span>
                            <span class="faq-icon">+</span>
                        </div>
                        <div class="faq-answer">
                            <p>Nakon transakcije možeš ocijeniti korisnika (1-5 zvjezdica). Ocjene pomažu drugima da odluče sa kim posluju.</p>
                        </div>
                    </div>
                    
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <span>🏆 Šta je Activity Score?</span>
                            <span class="faq-icon">+</span>
                        </div>
                        <div class="faq-answer">
                            <p>Dobijaš bodove za aktivnost: +5 za oglas, +10 za prodaju, +7 za kupovinu, +3 za ocjenu. Više bodova = viši status (Bronze, Silver, Gold).</p>
                        </div>
                    </div>
                    
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <span>🔒 Da li je platforma sigurna?</span>
                            <span class="faq-icon">+</span>
                        </div>
                        <div class="faq-answer">
                            <p>Da! Koristimo Firebase autentifikaciju (Google). Tvoji podaci su šifrovani. NIKAD ne dijeli lozinku.</p>
                        </div>
                    </div>
                    
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <span>📞 Kako kontaktirati podršku?</span>
                            <span class="faq-icon">+</span>
                        </div>
                        <div class="faq-answer">
                            <p><strong>Email:</strong> radomirkuc2@gmail.com<br>
                            <strong>Telefon:</strong> +382 63 493 850<br>
                            <strong>Ili:</strong> Koristi Sugestije stranicu u meniju</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    else if (page === 'rewards') {
        content.innerHTML = `
            <h1 class="page-title">🏆 Program Nagrada</h1>
            <div style="max-width:900px;margin:0 auto;">
                <div style="background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,165,0,0.1));padding:25px;border-radius:15px;margin-bottom:30px;text-align:center;">
                    <h2 style="font-size:1.5rem;margin-bottom:10px;">Nagradite se za aktivnost!</h2>
                    <p style="color:#888;">Što ste aktivniji, veće su vaše nagrade i benefiti</p>
                </div>
                
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;margin-bottom:30px;">
                    <div style="background:#1A1F38;padding:25px;border-radius:12px;border:2px solid #FFD700;text-align:center;">
                        <div style="font-size:3rem;margin-bottom:15px;">🥇</div>
                        <h3 style="color:#FFD700;margin-bottom:10px;">GOLD Status</h3>
                        <p style="font-size:0.9rem;color:#888;margin-bottom:15px;">100+ aktivnih bodova</p>
                        <div style="text-align:left;font-size:0.85rem;">
                            <p style="margin:8px 0;">✓ 20% popust na VIP</p>
                            <p style="margin:8px 0;">✓ Prioritet podrška</p>
                            <p style="margin:8px 0;">✓ Zlatni bedž</p>
                            <p style="margin:8px 0;">✓ Specijalne promocije</p>
                        </div>
                    </div>
                    
                    <div style="background:#1A1F38;padding:25px;border-radius:12px;border:2px solid #C0C0C0;text-align:center;">
                        <div style="font-size:3rem;margin-bottom:15px;">🥈</div>
                        <h3 style="color:#C0C0C0;margin-bottom:10px;">SILVER Status</h3>
                        <p style="font-size:0.9rem;color:#888;margin-bottom:15px;">50+ aktivnih bodova</p>
                        <div style="text-align:left;font-size:0.85rem;">
                            <p style="margin:8px 0;">✓ 10% popust na Premium</p>
                            <p style="margin:8px 0;">✓ Srebrni bedž</p>
                            <p style="margin:8px 0;">✓ Brža podrška</p>
                        </div>
                    </div>
                    
                    <div style="background:#1A1F38;padding:25px;border-radius:12px;border:2px solid #CD7F32;text-align:center;">
                        <div style="font-size:3rem;margin-bottom:15px;">🥉</div>
                        <h3 style="color:#CD7F32;margin-bottom:10px;">BRONZE Status</h3>
                        <p style="font-size:0.9rem;color:#888;margin-bottom:15px;">20+ aktivnih bodova</p>
                        <div style="text-align:left;font-size:0.85rem;">
                            <p style="margin:8px 0;">✓ Bronzani bedž</p>
                            <p style="margin:8px 0;">✓ Mjesečne nagrade</p>
                        </div>
                    </div>
                </div>
                
                <div style="background:#1A1F38;padding:25px;border-radius:12px;margin-bottom:20px;">
                    <h3 style="margin-bottom:15px;">📊 Kako zaraditi bodove?</h3>
                    <div style="display:grid;gap:12px;">
                        <div style="display:flex;justify-content:space-between;padding:12px;background:#0F1629;border-radius:8px;">
                            <span>Objava oglasa</span>
                            <strong style="color:#00E396;">+5 bodova</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:12px;background:#0F1629;border-radius:8px;">
                            <span>Uspješna prodaja</span>
                            <strong style="color:#00E396;">+10 bodova</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:12px;background:#0F1629;border-radius:8px;">
                            <span>Kupovina na aukciji</span>
                            <strong style="color:#00E396;">+7 bodova</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:12px;background:#0F1629;border-radius:8px;">
                            <span>Pozitivna ocjena</span>
                            <strong style="color:#00E396;">+3 boda</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:12px;background:#0F1629;border-radius:8px;">
                            <span>Dnevno prijavljivanje</span>
                            <strong style="color:#00E396;">+1 bod</strong>
                        </div>
                    </div>
                </div>
                
                <div style="background:#1A1F38;padding:25px;border-radius:12px;" id="userActivityScore">
                    ${currentUser ? `
                        <h3 style="margin-bottom:15px;">Vaši Bodovi</h3>
                        <div style="text-align:center;padding:30px;">
                            <div style="font-size:3rem;font-weight:900;color:#6C5CE7;margin-bottom:10px;" id="currentScore">0</div>
                            <p style="color:#888;">aktivnih bodova</p>
                        </div>
                    ` : `
                        <p style="text-align:center;color:#888;padding:30px;">
                            Prijavite se da vidite svoje bodove
                        </p>
                    `}
                </div>
            </div>
        `;
        
        if (currentUser) {
            loadUserScore();
        }
    }
    
    else if (page === 'admin') {
        if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
            showToast('Nemate pristup admin panelu!', 'error');
            showPage('home');
            return;
        }
        
        content.innerHTML = `
            <h1 class="page-title">🔐 Admin Panel</h1>
            <div style="max-width:900px;margin:0 auto;">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:30px;">
                    <div style="background:#1A1F38;padding:20px;border-radius:12px;border:2px solid #2A3150;text-align:center;">
                        <div style="font-size:2.5rem;font-weight:900;color:#00E396;" id="totalAuctions">0</div>
                        <div style="color:#888;font-size:0.9rem;">Ukupno Oglasa</div>
                    </div>
                    <div style="background:#1A1F38;padding:20px;border-radius:12px;border:2px solid #2A3150;text-align:center;">
                        <div style="font-size:2.5rem;font-weight:900;color:#6C5CE7;" id="totalUsers">0</div>
                        <div style="color:#888;font-size:0.9rem;">Ukupno Korisnika</div>
                    </div>
                    <div style="background:#1A1F38;padding:20px;border-radius:12px;border:2px solid #2A3150;text-align:center;">
                        <div style="font-size:2.5rem;font-weight:900;color:#FFD700;" id="totalVIP">0</div>
                        <div style="color:#888;font-size:0.9rem;">VIP Korisnika</div>
                    </div>
                </div>
                
                <div style="background:#1A1F38;padding:20px;border-radius:12px;border:2px solid #2A3150;margin-bottom:20px;">
                    <h3 style="margin-bottom:15px;">🔓 Aktivacija VIP/Premium</h3>
                    <form onsubmit="activateSubscription(event)">
                        <div class="form-group">
                            <label>Email korisnika</label>
                            <input type="email" id="adminUserEmail" required placeholder="korisnik@email.com">
                        </div>
                        <div class="form-group">
                            <label>Tip</label>
                            <select id="adminSubType" required>
                                <option value="vip">💎 VIP (30 dana)</option>
                                <option value="premium">⭐ Premium (10 dana)</option>
                            </select>
                        </div>
                        <button type="submit" class="btn-submit">Aktiviraj</button>
                    </form>
                </div>
                
                <div style="background:#1A1F38;padding:20px;border-radius:12px;border:2px solid #2A3150;">
                    <h3 style="margin-bottom:15px;">📊 Statistika</h3>
                    <div id="adminStats">Učitavam...</div>
                </div>
            </div>
        `;
        loadAdminStats();
    }
}

// ========================================
// FILE UPLOAD
// ========================================

// ========================================
// IMAGE COMPRESSION
// ========================================

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onerror = () => {
            console.error('❌ FileReader error');
            reject(new Error('Ne mogu pročitati fajl'));
        };
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onerror = () => {
                console.error('❌ Image load error');
                reject(new Error('Ne mogu učitati sliku'));
            };
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Max dimensions (smaller for faster load)
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG 70% quality
                    const compressed = canvas.toDataURL('image/jpeg', 0.7);
                    console.log('✅ Compressed:', file.name, '→', Math.round(compressed.length / 1024), 'KB');
                    resolve(compressed);
                } catch (err) {
                    console.error('❌ Canvas error:', err);
                    reject(err);
                }
            };
            
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    });
}

function handleFiles(files) {
    if (!files || files.length === 0) {
        console.log('❌ Nema fajlova');
        return;
    }
    
    console.log('📸 Primljeno fajlova:', files.length);
    
    const grid = document.getElementById('previewGrid');
    const counter = document.getElementById('imageCounter');
    
    if (!grid || !counter) {
        console.log('❌ Grid ili counter ne postoje');
        return;
    }
    
    // Convert FileList to Array
    const filesArray = Array.from(files);
    console.log('📋 Files array:', filesArray.length);
    
    // KRITIČNO: Resetuj selectedFiles i dodaj SVE nove slike odjednom
    selectedFiles = filesArray.slice(0, 10);
    console.log('✅ Total selected:', selectedFiles.length);
    
    // Clear grid
    grid.innerHTML = '';
    
    // Show all previews
    selectedFiles.forEach((file, index) => {
        console.log(`🖼️ Processing image ${index + 1}:`, file.name);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button type="button" onclick="removeFile(${index})" title="Ukloni sliku">×</button>
            `;
            grid.appendChild(div);
        };
        reader.onerror = (e) => {
            console.error(`❌ Greška pri učitavanju slike ${index + 1}:`, e);
        };
        reader.readAsDataURL(file);
    });
    
    // Update counter
    counter.textContent = `${selectedFiles.length}/10 slika`;
    counter.style.color = selectedFiles.length > 0 ? '#00E396' : '#888';
    
    if (selectedFiles.length >= 10) {
        counter.textContent += ' (Maksimum)';
        counter.style.color = '#FFD700';
        // Hide add more button
        const addMoreBtn = document.getElementById('addMoreBtn');
        if (addMoreBtn) addMoreBtn.style.display = 'none';
    } else if (selectedFiles.length > 0) {
        // Show add more button
        const addMoreBtn = document.getElementById('addMoreBtn');
        if (addMoreBtn) addMoreBtn.style.display = 'block';
    }
    
    console.log('✅ Preview kreiran za', selectedFiles.length, 'slika');
}

function removeFile(index) {
    console.log('Removing file at index:', index);
    selectedFiles.splice(index, 1);
    
    // Refresh preview
    const grid = document.getElementById('previewGrid');
    const counter = document.getElementById('imageCounter');
    
    if (!grid || !counter) return;
    
    grid.innerHTML = '';
    
    selectedFiles.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${i + 1}">
                <button type="button" onclick="removeFile(${i})">×</button>
            `;
            grid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
    
    counter.textContent = `${selectedFiles.length}/10 slika`;
    counter.style.color = selectedFiles.length > 0 ? '#00E396' : '#888';
}

// ========================================
// CREATE AUCTION
// ========================================

async function createAuction(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showToast('Morate biti prijavljeni!');
        return;
    }
    
    if (selectedFiles.length === 0) {
        showToast('Dodajte barem 1 sliku!', 'error');
        return;
    }
    
    const category = document.getElementById('category').value;
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const price = parseFloat(document.getElementById('price').value);
    const location = document.getElementById('location').value.trim();
    
    // Disable submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'OBJAVLJUJEM...';
        submitBtn.style.opacity = '0.6';
    }
    
    console.log('📤 Starting upload...');
    showToast('Objavljujem oglas...');
    
    try {
        // Convert images to base64 with compression
        console.log('🖼️ Compressing', selectedFiles.length, 'images...');
        const images = [];
        
        for (let i = 0; i < selectedFiles.length; i++) {
            console.log(`📸 Processing image ${i + 1}/${selectedFiles.length}`);
            
            try {
                const compressed = await compressImage(selectedFiles[i]);
                images.push(compressed);
                console.log(`✅ Image ${i + 1} compressed`);
            } catch (err) {
                console.error(`❌ Error compressing image ${i + 1}:`, err);
                showToast(`Greška sa slikom ${i + 1}`, 'error');
                throw err;
            }
        }
        
        console.log('💾 Saving to Firestore...');
        
        // Save to Firestore
        const docRef = await db.collection('aukcije').add({
            kategorija: category,
            naslov: title,
            opis: description,
            cijena: price,
            lokacija: location,
            slike: images,
            timestamp: Date.now(),
            endTime: Date.now() + (10 * 24 * 60 * 60 * 1000), // 10 dana
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Korisnik',
            userPhone: '+382',
            verified: false,
            isVIP: false,
            rating: 5,
            bids: [],
            views: 0,
            active: true
        });
        
        console.log('✅ Auction created:', docRef.id);
        
        // Update activity score (+5 for creating auction)
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            const currentScore = userDoc.data()?.activityScore || 0;
            await db.collection('users').doc(currentUser.uid).update({
                activityScore: currentScore + 5
            });
            console.log('✅ Activity score updated');
        } catch (err) {
            console.log('⚠️ Score update failed (non-critical):', err);
        }
        
        showToast('✅ Oglas uspješno objavljen!');
        selectedFiles = [];
        
        console.log('✅ Upload complete! Redirecting...');
        
        // Clear form and redirect
        event.target.reset();
        document.getElementById('previewGrid').innerHTML = '';
        document.getElementById('imageCounter').textContent = '0/10 slika';
        
        // Redirect after short delay
        setTimeout(() => {
            showPage('myAuctions');
        }, 1000);
        
    } catch (err) {
        console.error('❌ Error creating auction:', err);
        showToast('Greška pri objavljivanju: ' + err.message, 'error');
        
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'OBJAVI OGLAS';
            submitBtn.style.opacity = '1';
        }
    }
}

// ========================================
// STATS
// ========================================

async function loadStats() {
    if (!db) return;
    
    try {
        // Count auctions
        const auctionsSnap = await db.collection('aukcije').get();
        const totalAuctions = auctionsSnap.size;
        const activeAuctions = allAuctions.length;
        
        // Count users
        const usersSnap = await db.collection('users').get();
        const totalUsers = usersSnap.size;
        
        // Calculate total bids
        let totalBids = 0;
        allAuctions.forEach(a => {
            totalBids += (a.bids?.length || 0);
        });
        
        // Category stats
        const categoryStats = {};
        allAuctions.forEach(a => {
            categoryStats[a.kategorija] = (categoryStats[a.kategorija] || 0) + 1;
        });
        
        // Display stats cards
        document.getElementById('statsCards').innerHTML = `
            <div style="background:linear-gradient(135deg,#6C5CE7,#8B7CE7);padding:25px;border-radius:15px;text-align:center;">
                <div style="font-size:3rem;font-weight:900;margin-bottom:5px;">${totalAuctions}</div>
                <div style="font-size:0.9rem;opacity:0.9;">Ukupno Oglasa</div>
            </div>
            <div style="background:linear-gradient(135deg,#00E396,#00F5A0);padding:25px;border-radius:15px;text-align:center;">
                <div style="font-size:3rem;font-weight:900;margin-bottom:5px;">${activeAuctions}</div>
                <div style="font-size:0.9rem;opacity:0.9;">Aktivnih</div>
            </div>
            <div style="background:linear-gradient(135deg,#FF3366,#FF5588);padding:25px;border-radius:15px;text-align:center;">
                <div style="font-size:3rem;font-weight:900;margin-bottom:5px;">${totalUsers}</div>
                <div style="font-size:0.9rem;opacity:0.9;">Korisnika</div>
            </div>
            <div style="background:linear-gradient(135deg,#FFD700,#FFA500);padding:25px;border-radius:15px;text-align:center;">
                <div style="font-size:3rem;font-weight:900;margin-bottom:5px;">${totalBids}</div>
                <div style="font-size:0.9rem;opacity:0.9;">Ponuda</div>
            </div>
        `;
        
        // Display trending categories
        const sorted = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
        document.getElementById('trendingCategories').innerHTML = sorted.map(([cat, count]) => `
            <div style="display:flex;justify-content:space-between;padding:12px;background:#0F1629;border-radius:8px;margin-bottom:8px;">
                <span>${getCategoryName(cat)}</span>
                <strong style="color:#00E396;">${count} oglasa</strong>
            </div>
        `).join('');
        
        // Top users
        const usersList = [];
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.activityScore) {
                usersList.push({
                    name: data.name,
                    score: data.activityScore
                });
            }
        });
        
        usersList.sort((a, b) => b.score - a.score);
        
        document.getElementById('topUsers').innerHTML = usersList.slice(0, 10).map((user, i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#0F1629;border-radius:8px;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:30px;height:30px;background:${i < 3 ? '#FFD700' : '#6C5CE7'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;">${i + 1}</div>
                    <span>${user.name}</span>
                </div>
                <strong style="color:#00E396;">${user.score} bodova</strong>
            </div>
        `).join('') || '<p style="color:#888;text-align:center;padding:20px;">Još nema podataka</p>';
        
    } catch (err) {
        console.error('Load stats error:', err);
    }
}

function toggleFAQ(element) {
    const answer = element.querySelector('.faq-answer');
    const icon = element.querySelector('.faq-icon');
    
    if (answer.style.display === 'block') {
        answer.style.display = 'none';
        icon.textContent = '+';
    } else {
        // Close all others
        document.querySelectorAll('.faq-answer').forEach(a => a.style.display = 'none');
        document.querySelectorAll('.faq-icon').forEach(i => i.textContent = '+');
        
        // Open this one
        answer.style.display = 'block';
        icon.textContent = '−';
    }
}

// ========================================
// SEARCH & FILTER
// ========================================

let currentFilter = 'all';
let searchDebounce;

function searchAuctions() {
    // Debounce search for better performance
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        performSearch();
    }, 300);
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const sortBy = document.getElementById('sortSelect')?.value || 'newest';
    
    let filtered = allAuctions;
    
    // Apply category filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(a => a.kategorija === currentFilter);
    }
    
    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(a => 
            a.naslov.toLowerCase().includes(searchTerm) ||
            a.opis.toLowerCase().includes(searchTerm) ||
            a.lokacija.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply sorting
    switch(sortBy) {
        case 'newest':
            filtered.sort((a, b) => b.timestamp - a.timestamp);
            break;
        case 'price_low':
            filtered.sort((a, b) => a.cijena - b.cijena);
            break;
        case 'price_high':
            filtered.sort((a, b) => b.cijena - a.cijena);
            break;
        case 'ending_soon':
            filtered.sort((a, b) => a.endTime - b.endTime);
            break;
        case 'most_bids':
            filtered.sort((a, b) => (b.bids?.length || 0) - (a.bids?.length || 0));
            break;
    }
    
    renderFilteredAuctions(filtered);
}

function filterByCategory(category) {
    currentFilter = category;
    
    // Update active chip
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    
    searchAuctions();
}

function renderFilteredAuctions(auctions) {
    const grid = document.getElementById('auctionsGrid');
    if (!grid) return;
    
    if (auctions.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <p style="font-size:3rem;margin-bottom:10px;">🔍</p>
                <p>Nema rezultata</p>
                <p style="font-size:0.85rem;color:#888;margin-top:10px;">Pokušajte sa drugim kriterijumima</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = auctions.map(auction => {
        const timeLeft = auction.endTime - Date.now();
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const timeText = hours > 0 ? `⏰ ${hours}h ${minutes}m` : `⏰ ${minutes}m`;
        
        return `
            <div class="auction-card" onclick="openAuctionDetail('${auction.id}')">
                <div class="auction-image-wrapper">
                    <img src="${auction.slike[0]}" alt="${auction.naslov}" class="auction-image" loading="lazy" onerror="handleImageError(this)">
                    <div class="auction-timer">${timeText}</div>
                </div>
                <div class="auction-body">
                    <div class="auction-title">${auction.naslov}</div>
                    <div class="auction-price">${auction.cijena.toLocaleString()} €</div>
                    <div class="auction-location">📍 ${auction.lokacija}</div>
                    ${auction.bids && auction.bids.length > 0 ? `<div class="auction-bids">💰 ${auction.bids.length} ponuda</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
// LOAD & RENDER AUCTIONS
// ========================================

function loadAuctions() {
    if (!db) {
        console.log('Firebase not ready');
        return;
    }
    
    // Show loading
    const grid = document.getElementById('auctionsGrid');
    if (grid) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;"><div class="splash-loader" style="margin:0 auto;"></div></div>';
    }
    
    // Use real-time listener with limit for better performance
    db.collection('aukcije')
        .where('active', '==', true)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot(snapshot => {
            allAuctions = [];
            const now = Date.now();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                // Filter expired auctions client-side
                if (data.endTime > now) {
                    allAuctions.push({ id: doc.id, ...data });
                }
            });
            
            console.log('✅ Loaded auctions:', allAuctions.length);
            
            if (currentPage === 'home') {
                renderAuctions();
            }
        }, err => {
            console.error('❌ Load auctions error:', err);
            const grid = document.getElementById('auctionsGrid');
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column:1/-1;text-align:center;padding:40px;">
                        <p style="color:#FF3366;margin-bottom:15px;">⚠️ Greška pri učitavanju</p>
                        <button onclick="loadAuctions()" class="btn-submit" style="width:auto;padding:12px 30px;">
                            🔄 Pokušaj Ponovo
                        </button>
                    </div>
                `;
            }
        });
}

function renderAuctions() {
    const grid = document.getElementById('auctionsGrid');
    if (!grid) return;
    
    if (allAuctions.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <p style="font-size:3rem;margin-bottom:10px;">📦</p>
                <p>Nema aktivnih oglasa</p>
                <p style="font-size:0.85rem;color:#888;margin-top:10px;">Budite prvi i dodajte oglas!</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = allAuctions.map(auction => {
        const timeLeft = auction.endTime - Date.now();
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const timeText = hours > 0 ? `⏰ ${hours}h ${minutes}m` : `⏰ ${minutes}m`;
        
        return `
            <div class="auction-card" onclick="openAuctionDetail('${auction.id}')">
                <div class="auction-image-wrapper">
                    <img src="${auction.slike[0]}" alt="${auction.naslov}" class="auction-image" loading="lazy" onerror="handleImageError(this)">
                    <div class="auction-timer">${timeText}</div>
                </div>
                <div class="auction-body">
                    <div class="auction-title">${auction.naslov}</div>
                    <div class="auction-price">${auction.cijena.toLocaleString()} €</div>
                    <div class="auction-location">📍 ${auction.lokacija}</div>
                    ${auction.bids && auction.bids.length > 0 ? `<div class="auction-bids">💰 ${auction.bids.length} ponuda</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function loadMyAuctions() {
    if (!currentUser || !db) {
        console.log('⚠️ Nije prijavljen ili nema Firebase');
        return;
    }
    
    const grid = document.getElementById('myAuctionsGrid');
    if (!grid) {
        console.log('⚠️ Grid ne postoji');
        return;
    }
    
    // Show loading
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;"><div class="splash-loader" style="margin:0 auto;"></div><p style="margin-top:20px;color:#888;">Učitavam vaše oglase...</p></div>';
    
    try {
        console.log('📊 Učitavam oglase za:', currentUser.uid);
        
        const snapshot = await db.collection('aukcije')
            .where('userId', '==', currentUser.uid)
            .get();
        
        console.log('📊 Pronađeno:', snapshot.size, 'oglasa');
        
        const myAuctions = [];
        snapshot.forEach(doc => {
            myAuctions.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by timestamp (newest first)
        myAuctions.sort((a, b) => b.timestamp - a.timestamp);
        
        if (myAuctions.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <p style="font-size:3rem;margin-bottom:10px;">📦</p>
                    <p>Nemate objavljenih oglasa</p>
                    <button onclick="showPage('create')" class="btn-submit" style="margin-top:20px;width:auto;padding:12px 30px;">
                        ➕ Dodaj Prvi Oglas
                    </button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = myAuctions.map(auction => {
            const timeLeft = auction.endTime - Date.now();
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const timeText = hours > 0 ? `⏰ ${hours}h ${minutes}m` : `⏰ ${minutes}m`;
            
            return `
                <div class="auction-card" onclick="openAuctionDetail('${auction.id}')">
                    <div class="auction-image-wrapper">
                        <img src="${auction.slike[0]}" alt="${auction.naslov}" class="auction-image" loading="lazy" onerror="handleImageError(this)">
                        <div class="auction-timer">${timeText}</div>
                    </div>
                    <div class="auction-body">
                        <div class="auction-title">${auction.naslov}</div>
                        <div class="auction-price">${auction.cijena.toLocaleString()} €</div>
                        <div class="auction-location">📍 ${auction.lokacija}</div>
                        ${auction.bids && auction.bids.length > 0 ? `<div class="auction-bids">💰 ${auction.bids.length} ponuda</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('✅ Prikazano', myAuctions.length, 'oglasa');
        
    } catch (err) {
        console.error('❌ Load my auctions error:', err);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <p style="font-size:3rem;margin-bottom:10px;">⚠️</p>
                <p>Greška pri učitavanju oglasa</p>
                <p style="font-size:0.9rem;color:#888;margin-top:10px;">${err.message}</p>
                <button onclick="loadMyAuctions()" class="btn-submit" style="margin-top:20px;width:auto;padding:12px 30px;">
                    🔄 Pokušaj Ponovo
                </button>
            </div>
        `;
    }
}

// ========================================
// DELETE AUCTION
// ========================================

function deleteAuction(auctionId) {
    const container = document.getElementById('modalContainer');
    container.innerHTML = `
        <div class="modal active" id="modalOverlay" onclick="closeModalOnOverlay(event)">
            <div class="modal-content">
                <button class="modal-close" onclick="window.closeModal(); return false;" ontouchstart="window.closeModal(); return false;">×</button>
                <h2 class="modal-title">⚠️ Brisanje Oglasa</h2>
                <div style="text-align:center;padding:30px 20px;">
                    <p style="font-size:1.2rem;margin-bottom:20px;">Da li ste sigurni da želite obrisati ovaj oglas?</p>
                    <p style="color:#888;margin-bottom:30px;">Ova akcija se ne može poništiti.</p>
                    <div style="display:flex;gap:15px;">
                        <button onclick="closeModal()" class="btn-cancel" style="flex:1;padding:15px;background:#2A3150;border:none;color:white;border-radius:8px;font-weight:700;cursor:pointer;">
                            Otkaži
                        </button>
                        <button onclick="confirmDeleteAuction('${auctionId}')" class="btn-delete-confirm" style="flex:1;padding:15px;background:linear-gradient(135deg,#FF3366,#FF5588);border:none;color:white;border-radius:8px;font-weight:700;cursor:pointer;">
                            🗑️ Obriši
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function confirmDeleteAuction(auctionId) {
    if (!currentUser || !db) return;
    
    try {
        showToast('Brišem oglas...');
        
        await db.collection('aukcije').doc(auctionId).delete();
        
        // Remove from local array
        allAuctions = allAuctions.filter(a => a.id !== auctionId);
        
        showToast('✅ Oglas obrisan!');
        closeModal();
        
        // Redirect to my auctions
        setTimeout(() => {
            showPage('myAuctions');
        }, 500);
        
    } catch (err) {
        console.error('Delete auction error:', err);
        showToast('Greška pri brisanju!', 'error');
    }
}

// ========================================
// SHARE AUCTION
// ========================================

function shareAuction(auctionId, title) {
    const url = `${window.location.origin}#auction=${auctionId}`;
    const text = `Pogledaj ovu aukciju na eAukcija.me: ${title}`;
    
    // Check if Web Share API is available (mobile)
    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: url
        }).then(() => {
            showToast('✅ Podijeljeno!');
        }).catch(err => {
            console.log('Share cancelled', err);
        });
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            showToast('✅ Link kopiran u clipboard!');
        }).catch(() => {
            // Show manual copy dialog
            const container = document.getElementById('modalContainer');
            container.innerHTML = `
                <div class="modal active" id="modalOverlay" onclick="closeModalOnOverlay(event)">
                    <div class="modal-content">
                        <button class="modal-close" onclick="window.closeModal(); return false;" ontouchstart="window.closeModal(); return false;">×</button>
                        <h2 class="modal-title">🔗 Podijeli Oglas</h2>
                        <p style="margin-bottom:15px;">Kopiraj link:</p>
                        <input type="text" value="${url}" readonly onclick="this.select()" style="width:100%;padding:12px;margin-bottom:15px;">
                        <button onclick="closeModal()" class="btn-submit">Zatvori</button>
                    </div>
                </div>
            `;
        });
    }
}

// ========================================
// FAVORITES
// ========================================

async function toggleFavorite(auctionId) {
    if (!currentUser || !db) {
        showToast('Morate biti prijavljeni!');
        openAuthModal('login');
        return;
    }
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const favorites = userDoc.data()?.favorites || [];
        
        if (favorites.includes(auctionId)) {
            // Remove from favorites
            await db.collection('users').doc(currentUser.uid).update({
                favorites: favorites.filter(id => id !== auctionId)
            });
            showToast('❤️ Uklonjeno iz favorita');
        } else {
            // Add to favorites
            favorites.push(auctionId);
            await db.collection('users').doc(currentUser.uid).update({
                favorites: favorites
            });
            showToast('❤️ Dodato u favorite!');
        }
        
        // Refresh if on favorites page
        if (currentPage === 'favorites') {
            showPage('favorites');
        }
    } catch (err) {
        console.error('Toggle favorite error:', err);
        showToast('Greška', 'error');
    }
}

async function toggleWatch(auctionId) {
    if (!currentUser || !db) {
        showToast('Morate biti prijavljeni!');
        openAuthModal('login');
        return;
    }
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const watchlist = userDoc.data()?.watchlist || [];
        
        if (watchlist.includes(auctionId)) {
            // Remove from watchlist
            await db.collection('users').doc(currentUser.uid).update({
                watchlist: watchlist.filter(id => id !== auctionId)
            });
            showToast('👁️ Uklonjeno iz liste praćenja');
        } else {
            // Add to watchlist
            watchlist.push(auctionId);
            await db.collection('users').doc(currentUser.uid).update({
                watchlist: watchlist
            });
            showToast('👁️ Dodato! Dobićeš notifikacije!');
        }
        
        if (currentPage === 'watchlist') {
            showPage('watchlist');
        }
    } catch (err) {
        console.error('Toggle watch error:', err);
        showToast('Greška', 'error');
    }
}

async function loadWatchlist() {
    if (!currentUser || !db) return;
    
    const grid = document.getElementById('watchlistGrid');
    if (!grid) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const watchIds = userDoc.data()?.watchlist || [];
        
        if (watchIds.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <p style="font-size:3rem;margin-bottom:10px;">👁️</p>
                    <p>Nemaš praćenih oglasa</p>
                    <p style="font-size:0.9rem;color:#888;margin-top:10px;">
                        Dodaj oglase u Watch List da dobijaš notifikacije!
                    </p>
                </div>
            `;
            return;
        }
        
        const watchedAuctions = allAuctions.filter(a => watchIds.includes(a.id));
        
        if (watchedAuctions.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <p style="font-size:3rem;margin-bottom:10px;">⌛</p>
                    <p>Praćeni oglasi se učitavaju...</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = watchedAuctions.map(auction => {
            const timeLeft = auction.endTime - Date.now();
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const timeText = days > 0 ? `⏰ ${days}d ${hours}h` : `⏰ ${hours}h`;
            
            return `
                <div class="auction-card" onclick="openAuctionDetail('${auction.id}')">
                    <div class="auction-image-wrapper">
                        <img src="${auction.slike[0]}" alt="${auction.naslov}" class="auction-image" loading="lazy" onerror="handleImageError(this)">
                        <div class="auction-timer">${timeText}</div>
                        <div style="position:absolute;top:10px;left:10px;background:rgba(108,92,231,0.9);padding:5px 10px;border-radius:20px;font-size:0.8rem;font-weight:700;">
                            👁️ PRATIM
                        </div>
                    </div>
                    <div class="auction-body">
                        <div class="auction-title">${auction.naslov}</div>
                        <div class="auction-price">${auction.cijena.toLocaleString()} €</div>
                        <div class="auction-location">📍 ${auction.lokacija}</div>
                        ${auction.bids && auction.bids.length > 0 ? `<div class="auction-bids">💰 ${auction.bids.length} ponuda</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Load watchlist error:', err);
    }
}

async function loadFavorites() {
    if (!currentUser || !db) return;
    
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const favoriteIds = userDoc.data()?.favorites || [];
        
        if (favoriteIds.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <p style="font-size:3rem;margin-bottom:10px;">❤️</p>
                    <p>Nemate omiljenih oglasa</p>
                    <p style="font-size:0.9rem;color:#888;margin-top:10px;">Dodajte oglase u favorite da ih lako pronađete kasnije</p>
                </div>
            `;
            return;
        }
        
        // Load favorite auctions
        const favoriteAuctions = allAuctions.filter(a => favoriteIds.includes(a.id));
        
        if (favoriteAuctions.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <p style="font-size:3rem;margin-bottom:10px;">⌛</p>
                    <p>Vaši favoriti se učitavaju...</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = favoriteAuctions.map(auction => {
            const timeLeft = auction.endTime - Date.now();
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const timeText = hours > 0 ? `⏰ ${hours}h ${minutes}m` : `⏰ ${minutes}m`;
            
            return `
                <div class="auction-card" onclick="openAuctionDetail('${auction.id}')">
                    <div class="auction-image-wrapper">
                        <img src="${auction.slike[0]}" alt="${auction.naslov}" class="auction-image" loading="lazy" onerror="handleImageError(this)">
                        <div class="auction-timer">${timeText}</div>
                    </div>
                    <div class="auction-body">
                        <div class="auction-title">${auction.naslov}</div>
                        <div class="auction-price">${auction.cijena.toLocaleString()} €</div>
                        <div class="auction-location">📍 ${auction.lokacija}</div>
                        ${auction.bids && auction.bids.length > 0 ? `<div class="auction-bids">💰 ${auction.bids.length} ponuda</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Load favorites error:', err);
    }
}

// ========================================
// AUCTION DETAIL
// ========================================

function openAuctionDetail(auctionId) {
    const auction = allAuctions.find(a => a.id === auctionId);
    if (!auction) return;
    
    // Increment view counter
    if (db) {
        db.collection('aukcije').doc(auctionId).update({
            views: (auction.views || 0) + 1
        }).catch(err => console.log('View count error:', err));
    }
    
    const container = document.getElementById('modalContainer');
    
    const timeLeft = auction.endTime - Date.now();
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeDisplay = '';
    if (days > 0) timeDisplay = `${days}d ${hours}h`;
    else if (hours > 0) timeDisplay = `${hours}h ${minutes}m`;
    else timeDisplay = `${minutes}m`;
    
    const currentPrice = auction.bids && auction.bids.length > 0 
        ? Math.max(...auction.bids.map(b => b.amount))
        : auction.cijena;
    
    container.innerHTML = `
        <div class="modal active" id="modalOverlay" onclick="closeModalOnOverlay(event)">
            <div class="modal-content auction-detail-modal">
                <button class="modal-close" onclick="window.closeModal(); return false;" ontouchstart="window.closeModal(); return false;">×</button>
                
                <!-- IMAGE GALLERY -->
                <div class="auction-detail-gallery">
                    <img src="${auction.slike[0]}" id="mainImage" class="auction-detail-main-image" onerror="handleImageError(this)">
                    ${auction.slike.length > 1 ? `
                        <div class="auction-detail-thumbnails">
                            ${auction.slike.map((img, i) => `
                                <img src="${img}" class="auction-detail-thumb ${i === 0 ? 'active' : ''}" 
                                     onclick="changeMainImage('${img}', ${i})">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <!-- INFO -->
                <div class="auction-detail-info">
                    <h2 style="font-size:1.6rem;font-weight:800;margin-bottom:10px;">${auction.naslov}</h2>
                    <p style="color:#888;margin-bottom:5px;">📍 ${auction.lokacija}</p>
                    <p style="color:#888;">🏷️ ${getCategoryName(auction.kategorija)}</p>
                </div>
                
                <!-- TIMER -->
                <div class="auction-detail-timer-big">
                    <div class="label">Preostalo vrijeme</div>
                    <div class="time" id="detailTimer">${timeDisplay}</div>
                </div>
                
                <!-- CURRENT PRICE -->
                <div class="auction-detail-price">
                    ${currentPrice.toLocaleString()} €
                    <span style="font-size:0.5em;color:#888;">trenutna cijena</span>
                </div>
                
                <!-- BID SECTION -->
                <div class="bid-section">
                    <h3 style="margin-bottom:15px;">💰 Dajte Ponudu</h3>
                    <p style="font-size:0.9rem;color:#888;margin-bottom:10px;">
                        Ponude mogu biti <strong>niže</strong> ili <strong>više</strong> od trenutne cijene
                    </p>
                    <div class="bid-input-group">
                        <input type="number" id="bidAmount" placeholder="Vaša ponuda (€)" min="1" step="0.01">
                        <button onclick="placeBid('${auctionId}')">Ponudi</button>
                    </div>
                    
                    ${auction.bids && auction.bids.length > 0 ? `
                        <div class="bids-list">
                            <h4 style="margin:20px 0 10px;">Ponude (${auction.bids.length})</h4>
                            ${auction.bids.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5).map(bid => `
                                <div class="bid-item">
                                    <div>
                                        <strong>${bid.userName}</strong>
                                        <div style="font-size:0.8rem;color:#888;">${new Date(bid.timestamp).toLocaleString('sr-RS')}</div>
                                    </div>
                                    <div style="font-size:1.3rem;font-weight:900;color:#00E396;">${bid.amount} €</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="color:#888;margin-top:15px;text-align:center;">Još nema ponuda</p>'}
                </div>
                
                <!-- DESCRIPTION -->
                <div style="margin:20px 0;">
                    <h3 style="margin-bottom:10px;">📝 Opis</h3>
                    <p style="line-height:1.7;color:#B8C1EC;">${auction.opis}</p>
                </div>
                
                <!-- STATS -->
                <div style="display:flex;gap:20px;padding:15px;background:#0F1629;border-radius:10px;margin:20px 0;">
                    <div style="flex:1;text-align:center;">
                        <div style="font-size:1.5rem;font-weight:900;color:#6C5CE7;">${auction.views || 0}</div>
                        <div style="font-size:0.8rem;color:#888;">Pregleda</div>
                    </div>
                    <div style="flex:1;text-align:center;">
                        <div style="font-size:1.5rem;font-weight:900;color:#00E396;">${auction.bids ? auction.bids.length : 0}</div>
                        <div style="font-size:0.8rem;color:#888;">Ponuda</div>
                    </div>
                    <div style="flex:1;text-align:center;">
                        <div style="font-size:1.5rem;font-weight:900;color:#FFD700;">⭐</div>
                        <div style="font-size:0.8rem;color:#888;">Favorita</div>
                    </div>
                </div>
                
                <!-- SELLER INFO -->
                <div class="seller-info">
                    <div class="seller-avatar">${auction.userName.charAt(0).toUpperCase()}</div>
                    <div class="seller-details">
                        <div style="font-weight:700;">${auction.userName}</div>
                        <div class="seller-rating">${'⭐'.repeat(auction.rating || 5)}</div>
                    </div>
                </div>
                
                <!-- ACTION BUTTONS -->
                <div class="action-buttons" style="grid-template-columns: ${auction.userId === currentUser?.uid ? '1fr 1fr' : '1fr 1fr'};">
                    ${auction.userId === currentUser?.uid ? `
                        <!-- OWNER BUTTONS -->
                        <button class="btn-delete" onclick="deleteAuction('${auctionId}'); event.stopPropagation();">
                            🗑️ Obriši
                        </button>
                        <button class="btn-share" onclick="shareAuction('${auctionId}', '${auction.naslov}'); event.stopPropagation();">
                            🔗 Podijeli
                        </button>
                    ` : `
                        <!-- VISITOR BUTTONS -->
                        <button class="btn-watch" onclick="toggleWatch('${auctionId}'); event.stopPropagation();">
                            👁️ Prati
                        </button>
                        <button class="btn-favorite" onclick="toggleFavorite('${auctionId}'); event.stopPropagation();">
                            ❤️ Favorit
                        </button>
                        <button class="btn-chat" onclick="openChat('${auction.userId}', '${auction.userName}'); event.stopPropagation();">
                            💬 Chat
                        </button>
                        <button class="btn-share" onclick="shareAuction('${auctionId}', '${auction.naslov}'); event.stopPropagation();">
                            🔗 Podijeli
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
    
    // Start timer update
    updateDetailTimer(auction.endTime);
}

function changeMainImage(src, index) {
    document.getElementById('mainImage').src = src;
    document.querySelectorAll('.auction-detail-thumb').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

function getCategoryName(cat) {
    const categories = {
        'automobili': '🚗 Automobili',
        'nekretnine': '🏠 Nekretnine',
        'telefoni': '📱 Telefoni',
        'namjestaj': '🪑 Namještaj',
        'bijela_tehnika': '❄️ Bijela Tehnika',
        'alati': '🔧 Alati',
        'ostalo': '📦 Ostalo'
    };
    return categories[cat] || cat;
}

function updateDetailTimer(endTime) {
    const interval = setInterval(() => {
        const timerEl = document.getElementById('detailTimer');
        if (!timerEl) {
            clearInterval(interval);
            return;
        }
        
        const timeLeft = endTime - Date.now();
        if (timeLeft <= 0) {
            timerEl.textContent = 'ZAVRŠENO';
            clearInterval(interval);
            return;
        }
        
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        if (days > 0) timerEl.textContent = `${days}d ${hours}h ${minutes}m`;
        else if (hours > 0) timerEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
        else timerEl.textContent = `${minutes}m ${seconds}s`;
    }, 1000);
}

// ========================================
// BIDDING
// ========================================

async function placeBid(auctionId) {
    if (!currentUser) {
        showToast('Morate biti prijavljeni!');
        openAuthModal('login');
        return;
    }
    
    const amount = parseFloat(document.getElementById('bidAmount').value);
    
    if (!amount || amount <= 0) {
        showToast('Unesite validnu cijenu!', 'error');
        return;
    }
    
    try {
        const auction = allAuctions.find(a => a.id === auctionId);
        
        if (auction.userId === currentUser.uid) {
            showToast('Ne možete ponuditi na svoj oglas!', 'error');
            return;
        }
        
        const bids = auction.bids || [];
        
        const newBid = {
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Korisnik',
            amount: amount,
            timestamp: Date.now()
        };
        
        bids.push(newBid);
        
        await db.collection('aukcije').doc(auctionId).update({
            bids: bids,
            cijena: amount
        });
        
        // Send notification to seller
        await db.collection('notifications').add({
            userId: auction.userId,
            type: 'bid',
            auctionId: auctionId,
            auctionTitle: auction.naslov,
            bidderName: currentUser.displayName || 'Korisnik',
            amount: amount,
            timestamp: Date.now(),
            read: false
        });
        
        showToast('✅ Ponuda postavljena!');
        
        // Refresh detail
        setTimeout(() => openAuctionDetail(auctionId), 500);
        
    } catch (err) {
        console.error('Place bid error:', err);
        showToast('Greška pri postavljanju ponude', 'error');
    }
}

// ========================================
// CHAT
// ========================================

function openChat(sellerId, sellerName) {
    if (!currentUser) {
        showToast('Morate biti prijavljeni!');
        openAuthModal('login');
        return;
    }
    
    if (currentUser.uid === sellerId) {
        showToast('Ne možete poslati poruku sebi!', 'error');
        return;
    }
    
    const container = document.getElementById('modalContainer');
    container.innerHTML = `
        <div class="modal active" id="modalOverlay" onclick="closeModalOnOverlay(event)">
            <div class="modal-content">
                <button class="modal-close" onclick="window.closeModal(); return false;" ontouchstart="window.closeModal(); return false;">×</button>
                <h2 class="modal-title">💬 Chat sa ${sellerName}</h2>
                
                <div style="background:#0F1629;padding:15px;border-radius:10px;min-height:300px;max-height:400px;overflow-y:auto;margin:20px 0;" id="chatMessages">
                    <p style="text-align:center;color:#888;">Učitavam poruke...</p>
                </div>
                
                <form onsubmit="sendMessage(event, '${sellerId}')">
                    <div style="display:flex;gap:10px;">
                        <input type="text" id="chatInput" placeholder="Napišite poruku..." required style="flex:1;">
                        <button type="submit" class="btn-submit" style="width:auto;padding:12px 25px;margin:0;">Pošalji</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    loadChatMessages(sellerId);
}

async function loadChatMessages(otherUserId) {
    if (!currentUser || !db) return;
    
    const chatId = [currentUser.uid, otherUserId].sort().join('_');
    
    db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            const messagesDiv = document.getElementById('chatMessages');
            if (!messagesDiv) return;
            
            if (snapshot.empty) {
                messagesDiv.innerHTML = '<p style="text-align:center;color:#888;">Nema poruka. Pošaljite prvu!</p>';
                return;
            }
            
            messagesDiv.innerHTML = '';
            snapshot.forEach(doc => {
                const msg = doc.data();
                const isMine = msg.senderId === currentUser.uid;
                
                const div = document.createElement('div');
                div.style.cssText = `
                    margin-bottom:12px;
                    text-align:${isMine ? 'right' : 'left'};
                `;
                div.innerHTML = `
                    <div style="
                        display:inline-block;
                        background:${isMine ? '#6C5CE7' : '#1A1F38'};
                        padding:10px 15px;
                        border-radius:12px;
                        max-width:70%;
                        text-align:left;
                    ">
                        <div style="font-size:0.9rem;">${msg.text}</div>
                        <div style="font-size:0.7rem;color:rgba(255,255,255,0.6);margin-top:4px;">
                            ${new Date(msg.timestamp).toLocaleTimeString('sr-RS', {hour: '2-digit', minute: '2-digit'})}
                        </div>
                    </div>
                `;
                messagesDiv.appendChild(div);
            });
            
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
}

async function sendMessage(event, receiverId) {
    event.preventDefault();
    
    if (!currentUser || !db) return;
    
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
        const chatId = [currentUser.uid, receiverId].sort().join('_');
        
        await db.collection('chats').doc(chatId).collection('messages').add({
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'Korisnik',
            text: text,
            timestamp: Date.now()
        });
        
        input.value = '';
    } catch (err) {
        console.error('Send message error:', err);
        showToast('Greška pri slanju poruke', 'error');
    }
}

// ========================================
// RATING
// ========================================

function openRating(userId, userName) {
    if (!currentUser) {
        showToast('Morate biti prijavljeni!');
        openAuthModal('login');
        return;
    }
    
    if (currentUser.uid === userId) {
        showToast('Ne možete ocijeniti sebe!', 'error');
        return;
    }
    
    const container = document.getElementById('modalContainer');
    container.innerHTML = `
        <div class="modal active" id="modalOverlay" onclick="closeModalOnOverlay(event)">
            <div class="modal-content">
                <button class="modal-close" onclick="window.closeModal(); return false;" ontouchstart="window.closeModal(); return false;">×</button>
                <h2 class="modal-title">⭐ Ocijenite ${userName}</h2>
                
                <div style="text-align:center;margin:30px 0;">
                    <div style="font-size:3rem;margin-bottom:20px;" id="ratingStars">
                        <span onclick="setRating(1)" style="cursor:pointer;" class="star">⭐</span>
                        <span onclick="setRating(2)" style="cursor:pointer;" class="star">⭐</span>
                        <span onclick="setRating(3)" style="cursor:pointer;" class="star">⭐</span>
                        <span onclick="setRating(4)" style="cursor:pointer;" class="star">⭐</span>
                        <span onclick="setRating(5)" style="cursor:pointer;" class="star">⭐</span>
                    </div>
                    <input type="hidden" id="selectedRating" value="5">
                </div>
                
                <form onsubmit="submitRating(event, '${userId}')">
                    <div class="form-group">
                        <label>Komentar (opciono)</label>
                        <textarea id="ratingComment" rows="4" placeholder="Kako je bilo iskustvo?"></textarea>
                    </div>
                    <button type="submit" class="btn-submit">Pošalji Ocjenu</button>
                </form>
            </div>
        </div>
    `;
}

function setRating(rating) {
    document.getElementById('selectedRating').value = rating;
    const stars = document.querySelectorAll('#ratingStars .star');
    stars.forEach((star, i) => {
        star.style.opacity = i < rating ? '1' : '0.3';
    });
}

async function submitRating(event, userId) {
    event.preventDefault();
    
    if (!currentUser || !db) return;
    
    const rating = parseInt(document.getElementById('selectedRating').value);
    const comment = document.getElementById('ratingComment').value.trim();
    
    try {
        await db.collection('ratings').add({
            userId: userId,
            fromUserId: currentUser.uid,
            fromUserName: currentUser.displayName || 'Korisnik',
            rating: rating,
            comment: comment,
            timestamp: Date.now()
        });
        
        // Update user's average rating
        const ratingsSnap = await db.collection('ratings').where('userId', '==', userId).get();
        const ratings = [];
        ratingsSnap.forEach(doc => ratings.push(doc.data().rating));
        const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        
        await db.collection('users').doc(userId).update({
            rating: Math.round(avgRating)
        });
        
        showToast('✅ Ocjena poslata!');
        closeModal();
    } catch (err) {
        console.error('Submit rating error:', err);
        showToast('Greška pri slanju ocjene', 'error');
    }
}

// ========================================
// USER SCORE
// ========================================

async function loadUserScore() {
    if (!currentUser || !db) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        const score = userData?.activityScore || 0;
        
        const scoreEl = document.getElementById('currentScore');
        if (scoreEl) {
            scoreEl.textContent = score;
            
            // Determine status
            let status = '';
            if (score >= 100) status = '🥇 GOLD';
            else if (score >= 50) status = '🥈 SILVER';
            else if (score >= 20) status = '🥉 BRONZE';
            else status = '⭐ STARTER';
            
            scoreEl.insertAdjacentHTML('afterend', `
                <p style="color:#6C5CE7;font-size:1.2rem;margin-top:10px;font-weight:700;">${status}</p>
            `);
        }
    } catch (err) {
        console.error('Load user score error:', err);
    }
}

// ========================================
// VIP & PREMIUM
// ========================================

async function checkVIPStatus() {
    if (!currentUser || !db) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        const statusDiv = document.getElementById('vipStatus');
        if (!statusDiv) return;
        
        if (userData && userData.vipUntil && userData.vipUntil > Date.now()) {
            const daysLeft = Math.ceil((userData.vipUntil - Date.now()) / (1000 * 60 * 60 * 24));
            statusDiv.innerHTML = `
                <p style="color:#00E396;font-weight:700;">✅ VIP AKTIVAN</p>
                <p style="font-size:0.85rem;color:#888;margin-top:5px;">Preostalo: ${daysLeft} dana</p>
            `;
        }
    } catch (err) {
        console.error('Check VIP error:', err);
    }
}

async function checkPremiumStatus() {
    if (!currentUser || !db) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        const statusDiv = document.getElementById('premiumStatus');
        if (!statusDiv) return;
        
        if (userData && userData.premiumUntil && userData.premiumUntil > Date.now()) {
            const daysLeft = Math.ceil((userData.premiumUntil - Date.now()) / (1000 * 60 * 60 * 24));
            statusDiv.innerHTML = `
                <p style="color:#00E396;font-weight:700;">✅ PREMIUM AKTIVAN</p>
                <p style="font-size:0.85rem;color:#888;margin-top:5px;">Preostalo: ${daysLeft} dana</p>
            `;
        }
    } catch (err) {
        console.error('Check Premium error:', err);
    }
}

// ========================================
// SUGGESTIONS
// ========================================

async function submitSuggestion(event) {
    event.preventDefault();
    
    const text = document.getElementById('suggestionText').value.trim();
    
    if (!text) {
        showToast('Unesite sugestiju!', 'error');
        return;
    }
    
    try {
        await db.collection('sugestije').add({
            userId: currentUser ? currentUser.uid : 'anonymous',
            userName: currentUser ? currentUser.displayName : 'Anoniman',
            text: text,
            timestamp: Date.now()
        });
        
        showToast('✅ Sugestija poslata! Hvala vam!');
        
        // Close modal and clear form
        setTimeout(() => {
            showPage('home');
        }, 1000);
        
    } catch (err) {
        console.error('Submit suggestion error:', err);
        showToast('Greška pri slanju sugestije', 'error');
    }
}

// ========================================
// ADMIN PANEL
// ========================================

async function loadAdminStats() {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL || !db) return;
    
    try {
        // Count auctions
        const auctionsSnap = await db.collection('aukcije').get();
        document.getElementById('totalAuctions').textContent = auctionsSnap.size;
        
        // Count users
        const usersSnap = await db.collection('users').get();
        document.getElementById('totalUsers').textContent = usersSnap.size;
        
        // Count VIP users
        let vipCount = 0;
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.vipUntil && data.vipUntil > Date.now()) {
                vipCount++;
            }
        });
        document.getElementById('totalVIP').textContent = vipCount;
        
        // Show stats
        const statsDiv = document.getElementById('adminStats');
        statsDiv.innerHTML = `
            <p style="margin:8px 0;">✅ Sistem radi normalno</p>
            <p style="margin:8px 0;font-size:0.9rem;color:#888;">Posljednja provjera: ${new Date().toLocaleString('sr-RS')}</p>
        `;
    } catch (err) {
        console.error('Load admin stats error:', err);
    }
}

async function activateSubscription(event) {
    event.preventDefault();
    
    if (!currentUser || currentUser.email !== ADMIN_EMAIL || !db) return;
    
    const email = document.getElementById('adminUserEmail').value.trim();
    const type = document.getElementById('adminSubType').value;
    
    try {
        // Find user by email
        const usersSnap = await db.collection('users').where('email', '==', email).get();
        
        if (usersSnap.empty) {
            showToast('Korisnik nije pronađen!', 'error');
            return;
        }
        
        const userId = usersSnap.docs[0].id;
        const days = type === 'vip' ? 30 : 10;
        const until = Date.now() + (days * 24 * 60 * 60 * 1000);
        
        if (type === 'vip') {
            await db.collection('users').doc(userId).update({
                vipUntil: until,
                isVIP: true
            });
            showToast(`✅ VIP aktiviran za ${email} (30 dana)`);
        } else {
            await db.collection('users').doc(userId).update({
                premiumUntil: until
            });
            showToast(`✅ Premium aktiviran za ${email} (10 dana)`);
        }
        
        document.getElementById('adminUserEmail').value = '';
        loadAdminStats();
    } catch (err) {
        console.error('Activate subscription error:', err);
        showToast('Greška pri aktivaciji: ' + err.message, 'error');
    }
}

// ========================================
// SHOW ADMIN LINK IF ADMIN
// ========================================

function updateAuthButton() {
    const btn = document.getElementById('authButton');
    const adminLink = document.getElementById('adminLink');
    
    if (currentUser) {
        btn.textContent = 'Odjava';
        btn.onclick = () => {
            auth.signOut();
            showToast('Odjavljeni ste');
        };
        
        // Show admin link if admin
        if (currentUser.email === ADMIN_EMAIL && adminLink) {
            adminLink.style.display = 'block';
        }
    } else {
        btn.textContent = 'Prijava';
        btn.onclick = () => openAuthModal('login');
        
        if (adminLink) {
            adminLink.style.display = 'none';
        }
    }
}

// ========================================
// TOAST NOTIFICATIONS
// ========================================

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' error' : '');
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

console.log('✅ App loaded successfully');