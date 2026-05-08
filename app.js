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
let db, auth, storage;
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
    
    // Init Firebase
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            storage = firebase.storage();
            
            // Set persistence to LOCAL (stays logged in)
            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => {
                    console.log('✅ Auth persistence set to LOCAL');
                })
                .catch(err => {
                    console.error('⚠️ Persistence error:', err);
                });
            
            auth.onAuthStateChanged(user => {
                currentUser = user;
                updateAuthButton();
                console.log('🔐 Auth state:', user ? `Logged in as ${user.email}` : 'Not logged in');
            });
            
            // Load auctions (real-time listener)
            loadAuctions();
            
            // Hide splash after minimum time
            setTimeout(() => {
                document.getElementById('splashScreen').style.display = 'none';
                document.getElementById('mainApp').style.display = 'block';
                console.log('✅ App shown');
            }, 1500); // 1.5s minimum for smooth UX
            
            console.log('Firebase initialized');
        } catch (err) {
            console.error('❌ Firebase initialization error:', err);
            console.error('Error code:', err.code);
            console.error('Error message:', err.message);
            showToast(`Greška pri inicijalizaciji: ${err.message}`, 'error');
            // Show app anyway
            setTimeout(() => {
                document.getElementById('splashScreen').style.display = 'none';
                document.getElementById('mainApp').style.display = 'block';
                
            }, 2000);
        }
    } else {
        console.error('❌ Firebase library not loaded!');
        console.error('Check if Firebase scripts are loaded in index.html');
        showToast('Firebase nije učitan - provjerite internet konekciju', 'error');
        setTimeout(() => {
            document.getElementById('splashScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            
        }, 2000);
    }
    
    // Load saved theme - DEFAULT TO DARK
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.textContent = '☀️';
    } else {
        // Explicitly set dark mode
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.textContent = '🌙';
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
                            <input type="tel" id="authPhone" placeholder="Telefon (opcionalno)" required>
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
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Lock body scroll when sidebar is open
    if (sidebar.classList.contains('active')) {
        document.body.classList.add('sidebar-open');
    } else {
        document.body.classList.remove('sidebar-open');
    }
}

function showPage(page) {
    console.log('Showing page:', page);
    currentPage = page;
    
    // Close sidebar and unlock body scroll
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    document.body.classList.remove('sidebar-open');
    
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
                <input type="text" id="searchInput" placeholder="🔍 Pretraži aukcije..." onkeyup="debouncedSearch()">
                
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
                <div style="font-size:3.5rem;margin-bottom:15px;">🔨</div>
                <div style="font-size:2rem;font-weight:900;line-height:1.2;margin:15px 0;text-align:center;">
                    <span style="background:linear-gradient(135deg,#00D9FF,#FF3366);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:inline-block;">Dobrodošli</span>
                    <br>
                    <span style="color:#fff;font-size:1.2rem;">na</span>
                    <br>
                    <span style="background:linear-gradient(135deg,#00D9FF,#FF3366);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:inline-block;">eAukcija.me</span>
                </div>
                <p style="font-size:1rem;color:#888;margin:20px 0;line-height:1.6;">
                    Kupuj i prodaj kroz aukcije<br>
                    Brzo • Jednostavno • Besplatno
                </p>
                <button onclick="showPage('create')" class="hero-btn" style="margin:20px 0;">
                    ➕ Dodaj Oglas Odmah
                </button>
                <div class="hero-features" style="margin-top:25px;">
                    <div class="hero-feature">
                        <span class="hero-feature-icon">✅</span>
                        <span>Besplatno</span>
                    </div>
                    <div class="hero-feature">
                        <span class="hero-feature-icon">⚡</span>
                        <span>Brzo</span>
                    </div>
                    <div class="hero-feature">
                        <span class="hero-feature-icon">🔒</span>
                        <span>Sigurno</span>
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
            
            <!-- AD TYPE SELECTION -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:25px;">
                <button type="button" onclick="showPage('create-quick')" style="background:linear-gradient(135deg,#FF3366,#FF6B9D);color:#fff;border:none;padding:20px;border-radius:15px;font-size:1rem;font-weight:700;cursor:pointer;">
                    ⚡ BRZI OGLAS<br>
                    <span style="font-size:0.75rem;font-weight:400;opacity:0.9;">Bez kategorija</span>
                </button>
                <button type="button" style="background:linear-gradient(135deg,#6C5CE7,#A29BFE);color:#fff;border:none;padding:20px;border-radius:15px;font-size:1rem;font-weight:700;opacity:0.5;">
                    📋 DETALJAN<br>
                    <span style="font-size:0.75rem;font-weight:400;opacity:0.9;">Izabrano ✓</span>
                </button>
            </div>
            
            <form onsubmit="createAuction(event)">
                <div class="form-group">
                    <label>Kategorija</label>
                    <select id="category" required onchange="updateCategoryFields()">
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
                
                <!-- CATEGORY SPECIFIC FIELDS -->
                <div id="categoryFields"></div>
                
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
                    <label>Slike (max 9)</label>
                    
                    <!-- BIG VISUAL GUIDE -->
                    <div class="upload-instructions-box">
                        <div style="font-size:3rem;margin-bottom:10px;">📸</div>
                        <h3 style="margin-bottom:15px;font-size:1.3rem;">VAŽNO: Kako dodati više slika</h3>
                        <div class="upload-instructions-content">
                            <p style="margin:8px 0;font-weight:700;">📱 <strong>ANDROID:</strong></p>
                            <p style="margin:5px 0;padding-left:20px;">1. Klikni "DODAJ SLIKE" dugme</p>
                            <p style="margin:5px 0;padding-left:20px;">2. <strong>DRŽI PRST 2 SEKUNDE</strong> na prvoj slici</p>
                            <p style="margin:5px 0;padding-left:20px;">3. Pojavi se ✅ - sad klikaj ostale slike</p>
                            <p style="margin:5px 0;padding-left:20px;">4. Klikni "Done" ili "OK"</p>
                            <br>
                            <p style="margin:8px 0;font-weight:700;">📱 <strong>iPhone:</strong></p>
                            <p style="margin:5px 0;padding-left:20px;">1. Klikni "DODAJ SLIKE"</p>
                            <p style="margin:5px 0;padding-left:20px;">2. Klikni "Select" gore desno</p>
                            <p style="margin:5px 0;padding-left:20px;">3. Biraj slike (do 9)</p>
                            <p style="margin:5px 0;padding-left:20px;">4. Klikni "Add" ili "Done"</p>
                        </div>
                    </div>
                    
                    <button type="button" class="upload-btn-big" onclick="document.getElementById('fileInput').click()">
                        📸 DODAJ SLIKE (do 9)
                    </button>
                    
                    <input type="file" id="fileInput" multiple accept="image/*,image/jpeg,image/png,image/jpg,image/webp" style="display:none" onchange="handleFiles(this.files)">
                    
                    <div class="preview-grid" id="previewGrid"></div>
                    <div id="imageCounter" style="text-align:center;margin:15px 0;font-weight:700;font-size:1.2rem;color:#00E396;">0/8 slika</div>
                    
                    <button type="button" class="upload-btn-small" onclick="document.getElementById('fileInput').click()" style="display:none;" id="addMoreBtn">
                        ➕ Dodaj Još Slika
                    </button>
                </div>
                
                <button type="submit" class="btn-submit">OBJAVI OGLAS</button>
            </form>
        `;
    }
    
    else if (page === 'create-quick') {
        if (!currentUser) {
            showToast('Morate biti prijavljeni!');
            openAuthModal('login');
            return;
        }
        
        // Reset selected files
        selectedFiles = [];
        
        content.innerHTML = `
            <h1 class="page-title">⚡ Brzi Oglas</h1>
            
            <!-- AD TYPE SELECTION -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:25px;">
                <button type="button" style="background:linear-gradient(135deg,#FF3366,#FF6B9D);color:#fff;border:none;padding:20px;border-radius:15px;font-size:1rem;font-weight:700;opacity:0.5;">
                    ⚡ BRZI OGLAS<br>
                    <span style="font-size:0.75rem;font-weight:400;opacity:0.9;">Izabrano ✓</span>
                </button>
                <button type="button" onclick="showPage('create')" style="background:linear-gradient(135deg,#6C5CE7,#A29BFE);color:#fff;border:none;padding:20px;border-radius:15px;font-size:1rem;font-weight:700;cursor:pointer;">
                    📋 DETALJAN<br>
                    <span style="font-size:0.75rem;font-weight:400;opacity:0.9;">Sa kategorijama</span>
                </button>
            </div>
            
            <div style="background:#1A1F38;padding:25px;border-radius:15px;">
                <form onsubmit="createQuickAd(event)">
                    <div class="form-group">
                        <label>Naslov</label>
                        <input type="text" id="quickTitle" maxlength="100" required placeholder="Naziv proizvoda">
                    </div>
                    
                    <div class="form-group">
                        <label>Cijena (€)</label>
                        <input type="number" id="quickPrice" min="1" step="0.01" required placeholder="0.00">
                    </div>
                    
                    <div class="form-group">
                        <label>Lokacija</label>
                        <input type="text" id="quickLocation" required placeholder="Grad">
                    </div>
                    
                    <div class="form-group">
                        <label>Kratak Opis</label>
                        <textarea id="quickDesc" rows="4" maxlength="500" required placeholder="Opis proizvoda (max 500 karaktera)..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Slike (max 9)</label>
                        <input type="file" id="auctionImages" multiple accept="image/*" style="display:none" onchange="handleFiles(this.files)">
                        <button type="button" class="upload-btn-big" onclick="document.getElementById('auctionImages').click()">
                            📸 DODAJ SLIKE
                        </button>
                        <div id="previewGrid" class="preview-grid"></div>
                        <div id="imageCounter" style="text-align:center;margin-top:10px;font-weight:700;color:#888;">0/8 slika</div>
                    </div>
                    
                    <button type="submit" class="btn-submit">⚡ OBJAVI BRZO</button>
                </form>
            </div>
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
                        <p style="font-size:2.5rem;font-weight:900;color:#FFD700;margin-bottom:5px;">30€</p>
                        <p style="color:#888;font-size:1rem;">30 dana VIP pristupa</p>
                    </div>
                    
                    <div style="text-align:left;margin:20px 0;">
                        <p style="margin:8px 0;"><strong>✓</strong> Zlatni VIP bedž</p>
                        <p style="margin:8px 0;"><strong>✓</strong> Neograničen broj oglasa</p>
                        <p style="margin:8px 0;"><strong>✓</strong> Prioritet u pretrazi</p>
                        <p style="margin:8px 0;"><strong>✓</strong> Premium podrška 24/7</p>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.05);padding:20px;border-radius:10px;margin-top:20px;text-align:left;">
                        <p style="font-weight:700;margin-bottom:10px;color:#FFD700;">💳 Plaćanje Karticom:</p>
                        <p style="color:#888;font-size:0.9rem;margin-bottom:8px;">
                            1. Kontaktirajte nas na:<br>
                            <strong style="color:#00E396;">eaukcijame@gmail.com</strong>
                        </p>
                        <p style="color:#888;font-size:0.9rem;margin-bottom:8px;">
                            2. Dobićete link za sigurno plaćanje karticom
                        </p>
                        <p style="color:#888;font-size:0.9rem;">
                            3. VIP status aktivira se odmah nakon plaćanja
                        </p>
                    </div>
                    
                    <button class="btn-submit" onclick="window.location.href='mailto:eaukcijame@gmail.com?subject=VIP%20Paket%20-%20Plaćanje&body=Zdravo,%0A%0AŽelim%20aktivirati%20VIP%20paket%20(30€/30%20dana).%0A%0AMoj%20email:%20[unesite%20vaš%20email]%0A%0AHvala!'" style="width:100%;margin-top:20px;padding:15px;font-size:1.1rem;">
                        📧 Kontaktiraj za Plaćanje
                    </button>
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
                        <p style="font-size:2.5rem;font-weight:900;color:#6C5CE7;margin-bottom:5px;">10€</p>
                        <p style="color:#888;font-size:1rem;">10 dana Premium oglasa</p>
                    </div>
                    
                    <div style="text-align:left;margin:20px 0;">
                        <p style="margin:8px 0;"><strong>✓</strong> Istaknut na vrhu liste</p>
                        <p style="margin:8px 0;"><strong>✓</strong> Premium bedž</p>
                        <p style="margin:8px 0;"><strong>✓</strong> 5x više pregleda</p>
                        <p style="margin:8px 0;"><strong>✓</strong> Poseban dizajn kartice</p>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.05);padding:20px;border-radius:10px;margin-top:20px;text-align:left;">
                        <p style="font-weight:700;margin-bottom:10px;color:#6C5CE7;">💳 Plaćanje Karticom:</p>
                        <p style="color:#888;font-size:0.9rem;margin-bottom:8px;">
                            1. Kontaktirajte nas na:<br>
                            <strong style="color:#00E396;">eaukcijame@gmail.com</strong>
                        </p>
                        <p style="color:#888;font-size:0.9rem;margin-bottom:8px;">
                            2. Dobićete link za sigurno plaćanje karticom
                        </p>
                        <p style="color:#888;font-size:0.9rem;">
                            3. Premium status aktivira se odmah nakon plaćanja
                        </p>
                    </div>
                    
                    <button class="btn-submit" onclick="window.location.href='mailto:eaukcijame@gmail.com?subject=Premium%20Oglas%20-%20Plaćanje&body=Zdravo,%0A%0AŽelim%20aktivirati%20Premium%20oglas%20(10€/10%20dana).%0A%0AID%20Oglasa:%20[unesite%20ID]%0AMoj%20email:%20[unesite%20vaš%20email]%0A%0AHvala!'" style="width:100%;margin-top:20px;padding:15px;font-size:1.1rem;">
                        📧 Kontaktiraj za Plaćanje
                    </button>
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
                            <strong style="color:#00E396;">📧 eaukcijame@gmail.com</strong><br>
                            <strong style="color:#00E396;">📞 kontakt u pripremi</strong>
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
                            <p><strong>Android:</strong> Drži prst na prvoj slici 2 sekunde, pojave se checkboxovi, označi do 9 slika, klikni Done.</p>
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
                            <p><strong>Email:</strong> eaukcijame@gmail.com<br>
                            <strong>Telefon:</strong> kontakt u pripremi<br>
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
        
        reader.onerror = (e) => {
            console.error('❌ FileReader error:', e);
            console.error('Error details:', e.target.error);
            reject(new Error('Ne mogu pročitati fajl. Provjerite da li je slika ispravna.'));
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
                    
                    // Max dimensions (smaller for Firebase limit)
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    
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
                    
                    // Compress to JPEG 50% quality (very low for small size)
                    const compressed = canvas.toDataURL('image/jpeg', 0.5);
                    
                    // Check size - Firebase doc limit is ~1MB
                    const sizeKB = Math.round(compressed.length / 1024);
                    console.log('✅ Compressed:', file.name, '→', sizeKB, 'KB');
                    
                    if (sizeKB > 300) {
                        console.warn('⚠️ Image still large, compressing more to 30%');
                        const moreCompressed = canvas.toDataURL('image/jpeg', 0.3);
                        resolve(moreCompressed);
                    } else {
                        resolve(compressed);
                    }
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
    
    // ADD new files to existing (up to 10 total)
    const remainingSlots = 9 - selectedFiles.length;
    const newFiles = filesArray.slice(0, remainingSlots);
    
    newFiles.forEach(file => {
        selectedFiles.push(file);
    });
    
    console.log('✅ Total selected:', selectedFiles.length);
    
    // Clear grid and re-render ALL
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
    counter.textContent = `${selectedFiles.length}/8 slika`;
    counter.style.color = selectedFiles.length > 0 ? '#00E396' : '#888';
    
    if (selectedFiles.length >= 9) {
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
    
    counter.textContent = `${selectedFiles.length}/8 slika`;
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
        // Max 8 images
        if (selectedFiles.length > 8) {
            showToast('⚠️ Maksimalno 8 slika!', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '✅ OBJAVI OGLAS';
                submitBtn.style.opacity = '1';
            }
            return;
        }
        
        // Upload to Imgur
        const imageUrls = [];
        
        for (let i = 0; i < selectedFiles.length; i++) {
            showToast(`Slika ${i + 1}/${selectedFiles.length}...`);
            
            const compressed = await compressImage(selectedFiles[i]);
            
            const formData = new FormData();
            const blob = await fetch(compressed).then(r => r.blob());
            formData.append('image', blob);
            
            const response = await fetch('https://api.imgur.com/3/image', {
                method: 'POST',
                headers: {
                    'Authorization': 'Client-ID 534e4c5c3e4aa62'
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                imageUrls.push(data.data.link);
            } else {
                throw new Error('Upload failed');
            }
        }
        
        console.log('💾 Saving to Firestore...');
        
        // Save to Firestore
        
        // Collect category-specific data
        const categoryData = {};
        
        if (category === 'automobili') {
            categoryData.marka_auta = document.getElementById('marka_auta')?.value || '';
            categoryData.model_auta = document.getElementById('model_auta')?.value || '';
            categoryData.tip_vozila = document.getElementById('tip_vozila')?.value || '';
            categoryData.kilometraza = document.getElementById('kilometraza')?.value || '';
            categoryData.godiste = document.getElementById('godiste')?.value || '';
            categoryData.registrovan = document.getElementById('registrovan')?.value || '';
            categoryData.registracija_do = document.getElementById('registracija_do')?.value || '';
            categoryData.gorivo = document.getElementById('gorivo')?.value || '';
            categoryData.kubikaza = document.getElementById('kubikaza')?.value || '';
            categoryData.snaga_kw = document.getElementById('snaga_kw')?.value || '';
            categoryData.transmisija = document.getElementById('transmisija')?.value || '';
            categoryData.pogon = document.getElementById('pogon')?.value || '';
            categoryData.boja = document.getElementById('boja')?.value || '';
            categoryData.broj_vrata = document.getElementById('broj_vrata')?.value || '';
            categoryData.broj_sjedista = document.getElementById('broj_sjedista')?.value || '';
            categoryData.klima = document.getElementById('klima')?.value || '';
            categoryData.stanje_vozila = document.getElementById('stanje_vozila')?.value || '';
        } else if (category === 'nekretnine') {
            categoryData.tip_nekretnine = document.getElementById('tip_nekretnine')?.value || '';
            categoryData.kvadratura = document.getElementById('kvadratura')?.value || '';
            categoryData.broj_soba = document.getElementById('broj_soba')?.value || '';
            categoryData.sprat = document.getElementById('sprat')?.value || '';
            categoryData.broj_kupatila = document.getElementById('broj_kupatila')?.value || '';
            categoryData.grijanje = document.getElementById('grijanje')?.value || '';
            categoryData.parking = document.getElementById('parking')?.value || '';
            categoryData.lift = document.getElementById('lift')?.value || '';
            categoryData.balkon = document.getElementById('balkon')?.value || '';
            categoryData.namjesten = document.getElementById('namjesten')?.value || '';
            categoryData.godina_izgradnje = document.getElementById('godina_izgradnje')?.value || '';
            categoryData.stanje_nekretnine = document.getElementById('stanje_nekretnine')?.value || '';
        } else if (category === 'telefoni') {
            categoryData.marka = document.getElementById('marka')?.value || '';
            categoryData.model = document.getElementById('model')?.value || '';
            categoryData.memorija = document.getElementById('memorija')?.value || '';
            categoryData.ram = document.getElementById('ram')?.value || '';
            categoryData.baterija = document.getElementById('baterija')?.value || '';
            categoryData.kamera = document.getElementById('kamera')?.value || '';
            categoryData.ekran = document.getElementById('ekran')?.value || '';
            categoryData.os = document.getElementById('os')?.value || '';
            categoryData['5g'] = document.getElementById('5g')?.value || '';
            categoryData.dual_sim = document.getElementById('dual_sim')?.value || '';
            categoryData.stanje = document.getElementById('stanje')?.value || '';
            categoryData.garancija = document.getElementById('garancija')?.value || '';
        } else if (category === 'namjestaj') {
            categoryData.tip_namjestaja = document.getElementById('tip_namjestaja')?.value || '';
            categoryData.materijal = document.getElementById('materijal')?.value || '';
            categoryData.boja_namjestaja = document.getElementById('boja_namjestaja')?.value || '';
            categoryData.dimenzije = document.getElementById('dimenzije')?.value || '';
            categoryData.stanje_namjestaja = document.getElementById('stanje_namjestaja')?.value || '';
        } else if (category === 'bijela_tehnika') {
            categoryData.tip_uredjaja = document.getElementById('tip_uredjaja')?.value || '';
            categoryData.marka_tehnika = document.getElementById('marka_tehnika')?.value || '';
            categoryData.model_tehnika = document.getElementById('model_tehnika')?.value || '';
            categoryData.energetska_klasa = document.getElementById('energetska_klasa')?.value || '';
            categoryData.kapacitet = document.getElementById('kapacitet')?.value || '';
            categoryData.godina_proizvodnje = document.getElementById('godina_proizvodnje')?.value || '';
            categoryData.stanje_tehnika = document.getElementById('stanje_tehnika')?.value || '';
            categoryData.garancija_tehnika = document.getElementById('garancija_tehnika')?.value || '';
        } else if (category === 'alati') {
            categoryData.tip_alata = document.getElementById('tip_alata')?.value || '';
            categoryData.marka_alat = document.getElementById('marka_alat')?.value || '';
            categoryData.model_alat = document.getElementById('model_alat')?.value || '';
            categoryData.napajanje = document.getElementById('napajanje')?.value || '';
            categoryData.snaga_alat = document.getElementById('snaga_alat')?.value || '';
            categoryData.stanje_alat = document.getElementById('stanje_alat')?.value || '';
            categoryData.garancija_alat = document.getElementById('garancija_alat')?.value || '';
        }
        
        console.log('📋 Category data collected:', categoryData);
        
        const docRef = await db.collection('aukcije').add({
            kategorija: category,
            naslov: title,
            opis: description,
            cijena: price,
            lokacija: location,
            slike: imageUrls,
            categoryData: categoryData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            endTime: Date.now() + (10 * 24 * 60 * 60 * 1000), // 10 dana
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Korisnik',
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
        document.getElementById('imageCounter').textContent = '0/8 slika';
        
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
    
    // Use .get() instead of .onSnapshot to avoid WebSocket errors
    db.collection('aukcije')
        .where('active', '==', true)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get()
        .then(snapshot => {
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
        })
        .catch(err => {
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
        grid.innerHTML = getEmptyState('no-auctions');
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
            grid.innerHTML = getEmptyState('no-my-auctions');
            return;
        }
        
        grid.innerHTML = myAuctions.map(auction => {
            const timeLeft = auction.endTime - Date.now();
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const timeText = hours > 0 ? `⏰ ${hours}h ${minutes}m` : `⏰ ${minutes}m`;
            const isExpired = timeLeft < 0;
            
            return `
                <div class="auction-card" style="position:relative;">
                    <div onclick="openAuctionDetail('${auction.id}')" style="cursor:pointer;">
                        <div class="auction-image-wrapper">
                            <img src="${auction.slike[0]}" alt="${auction.naslov}" class="auction-image" loading="lazy" onerror="handleImageError(this)">
                            <div class="auction-timer">${isExpired ? '⏰ Istekao' : timeText}</div>
                        </div>
                        <div class="auction-body">
                            <div class="auction-title">${auction.naslov}</div>
                            <div class="auction-price">${auction.cijena.toLocaleString()} €</div>
                            <div class="auction-location">📍 ${auction.lokacija}</div>
                            ${auction.bids && auction.bids.length > 0 ? `<div class="auction-bids">💰 ${auction.bids.length} ponuda</div>` : ''}
                        </div>
                    </div>
                    <button onclick="event.stopPropagation(); deleteMyAuction('${auction.id}')" 
                            style="position:absolute;top:10px;right:10px;background:#F44336;color:white;border:none;border-radius:50%;width:35px;height:35px;font-size:1.2rem;cursor:pointer;box-shadow:0 2px 8px rgba(244,67,54,0.4);z-index:10;"
                            title="Obriši oglas">
                        🗑️
                    </button>
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
        
        // Check if user document exists
        if (!userDoc.exists) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <p style="font-size:3rem;margin-bottom:10px;">❤️</p>
                    <p>Nemate omiljenih oglasa</p>
                </div>
            `;
            return;
        }
        
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
                    
                    <div style="margin-top:15px;padding:15px;background:rgba(0,217,255,0.05);border-left:3px solid #00D9FF;border-radius:8px;">
                        <div>
                            <span style="color:#888;">📍 Lokacija:</span>
                            <strong style="margin-left:8px;color:#00D9FF;">${auction.lokacija}</strong>
                        </div>
                    </div>
                </div>
                
                <!-- CATEGORY DATA -->
                ${auction.categoryData && Object.keys(auction.categoryData).some(k => auction.categoryData[k]) ? `
                    <div class="category-fields-box">
                        <h3 style="color:#6C5CE7;margin-bottom:15px;font-size:1.2rem;">ℹ️ Specifikacije</h3>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
                            ${Object.entries(auction.categoryData).map(([key, value]) => {
                                if (!value) return '';
                                const label = key
                                    .replace(/_/g, ' ')
                                    .split(' ')
                                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(' ');
                                return `
                                    <div style="padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;border-left:3px solid #5DADE2;">
                                        <div style="font-size:0.75rem;color:#888;text-transform:uppercase;margin-bottom:4px;">${label}</div>
                                        <div style="font-weight:700;color:#E0E6F0;">${value}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
                
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
                    ${auction.userId !== currentUser?.uid ? `
                        <button onclick="openChat('${auction.userId}', '${auction.userName}')" 
                                style="background:#25D366;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:700;margin-left:auto;">
                            💬 Chat
                        </button>
                    ` : ''}
                </div>
                
                <!-- ACTION BUTTONS -->
                <div class="action-buttons" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;">
                    ${auction.userId === currentUser?.uid ? `
                        <!-- OWNER BUTTONS -->
                        <button class="btn-delete" onclick="deleteAuction('${auctionId}'); event.stopPropagation();">
                            🗑️ Obriši
                        </button>
                        <button class="btn-share" onclick="shareToSocial('${auctionId}', '${auction.naslov}', ${auction.cijena}); event.stopPropagation();">
                            📤 Podijeli
                        </button>
                        <button class="btn-share" onclick="printAuction('${auctionId}'); event.stopPropagation();">
                            🖨️ Štampaj
                        </button>
                    ` : `
                        <!-- VISITOR BUTTONS -->
                        <button class="btn-favorite" onclick="quickSaveToFavorites('${auctionId}'); event.stopPropagation();">
                            ❤️ Sačuvaj
                        </button>
                        <button class="btn-share" onclick="shareToSocial('${auctionId}', '${auction.naslov}', ${auction.cijena}); event.stopPropagation();">
                            📤 Podijeli
                        </button>
                        <button class="btn-watch" onclick="reportAuction('${auctionId}'); event.stopPropagation();">
                            🚩 Prijavi
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
        // Send email via mailto (simpler than Firebase)
        const subject = encodeURIComponent('Sugestija - eAukcija.me');
        const body = encodeURIComponent(
            `Korisnik: ${currentUser ? currentUser.displayName : 'Anoniman'}\n` +
            `Email: ${currentUser ? currentUser.email : 'Nije prijavljen'}\n\n` +
            `Sugestija:\n${text}`
        );
        
        window.location.href = `mailto:eaukcijame@gmail.com?subject=${subject}&body=${body}`;
        
        showToast('✅ Email klijent otvoren! Pošaljite poruku.');
        
        // Clear form
        document.getElementById('suggestionText').value = '';
        
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
            console.log('✅ Admin user detected:', currentUser.email);
            adminLink.style.display = 'block';
        } else {
            console.log('❌ Not admin:', currentUser.email, '!==', ADMIN_EMAIL);
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
// ========================================
// THEME TOGGLE
// ========================================

window.toggleTheme = function() {
    document.body.classList.toggle('light-mode');
    const toggle = document.getElementById('themeToggle');
    
    if (document.body.classList.contains('light-mode')) {
        toggle.textContent = '☀️';
        localStorage.setItem('theme', 'light');
        // Apply light mode cleanup
        setTimeout(() => applyLightModeCleanup(), 100);
    } else {
        toggle.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    }
};

// ========================================
// LOADING HELPERS
// ========================================

function showLoader() {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'loader active';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
    }
    loader.classList.add('active');
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.classList.remove('active');
    }
}

// ========================================
// IMPROVED EMPTY STATES
// ========================================

function getEmptyState(type) {
    const states = {
        'no-auctions': {
            icon: '📦',
            title: 'Nema oglasa',
            message: 'Trenutno nema aktivnih oglasa u ovoj kategoriji',
            action: null
        },
        'no-my-auctions': {
            icon: '📦',
            title: 'Nemate objavljenih oglasa',
            message: 'Budite prvi koji će dodati oglas!',
            action: { text: 'Dodaj Prvi Oglas', page: 'create' }
        },
        'no-favorites': {
            icon: '❤️',
            title: 'Nema favorita',
            message: 'Označite oglase kao favorite da bi ih pratili ovdje',
            action: { text: 'Pregledaj Oglase', page: 'home' }
        },
        'error': {
            icon: '⚠️',
            title: 'Došlo je do greške',
            message: 'Molimo pokušajte ponovo kasnije',
            action: { text: 'Osvježi Stranicu', onclick: 'location.reload()' }
        }
    };
    
    const state = states[type] || states['no-auctions'];
    
    let html = `
        <div class="empty-state">
            <span class="empty-icon">${state.icon}</span>
            <h3>${state.title}</h3>
            <p>${state.message}</p>
    `;
    
    if (state.action) {
        if (state.action.page) {
            html += `<button class="btn-submit" onclick="showPage('${state.action.page}')">${state.action.text}</button>`;
        } else if (state.action.onclick) {
            html += `<button class="btn-submit" onclick="${state.action.onclick}">${state.action.text}</button>`;
        }
    }
    
    html += '</div>';
    return html;
}

console.log('✅ All improvements loaded!');


// ========================================
// CATEGORY SPECIFIC FIELDS
// ========================================

window.updateCategoryFields = function() {
    const category = document.getElementById('category')?.value;
    const container = document.getElementById('categoryFields');
    
    if (!container) return;
    
    let html = '';
    
    if (category === 'automobili') {
        html = `
            <div class="category-fields-box">
                <h3 style="color:#6C5CE7;margin-bottom:20px;font-size:1.3rem;display:flex;align-items:center;gap:10px;">
                    🚗 Dodatne Informacije - Automobil
                </h3>
                
                <div class="form-group">
                    <label>Marka Automobila *</label>
                    <select id="marka_auta" required>
                        <option value="">Izaberi marku</option>
                        <option value="Audi">Audi</option>
                        <option value="BMW">BMW</option>
                        <option value="Mercedes-Benz">Mercedes-Benz</option>
                        <option value="Volkswagen">Volkswagen (VW)</option>
                        <option value="Opel">Opel</option>
                        <option value="Ford">Ford</option>
                        <option value="Renault">Renault</option>
                        <option value="Peugeot">Peugeot</option>
                        <option value="Citroen">Citroen</option>
                        <option value="Fiat">Fiat</option>
                        <option value="Škoda">Škoda</option>
                        <option value="Seat">Seat</option>
                        <option value="Toyota">Toyota</option>
                        <option value="Honda">Honda</option>
                        <option value="Mazda">Mazda</option>
                        <option value="Nissan">Nissan</option>
                        <option value="Hyundai">Hyundai</option>
                        <option value="Kia">Kia</option>
                        <option value="Suzuki">Suzuki</option>
                        <option value="Dacia">Dacia</option>
                        <option value="Tesla">Tesla</option>
                        <option value="Alfa Romeo">Alfa Romeo</option>
                        <option value="Lancia">Lancia</option>
                        <option value="Volvo">Volvo</option>
                        <option value="Subaru">Subaru</option>
                        <option value="Mitsubishi">Mitsubishi</option>
                        <option value="Jeep">Jeep</option>
                        <option value="Land Rover">Land Rover</option>
                        <option value="Porsche">Porsche</option>
                        <option value="Ostalo">Ostalo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Model *</label>
                    <input type="text" id="model_auta" required placeholder="npr. Golf 7, A4, 320d">
                </div>
                
                <div class="form-group">
                    <label>Tip Vozila *</label>
                    <select id="tip_vozila" required>
                        <option value="">Izaberi tip</option>
                        <option value="Limuzina">Limuzina (Sedan)</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Karavan">Karavan (Kombi)</option>
                        <option value="SUV">SUV</option>
                        <option value="Crossover">Crossover</option>
                        <option value="Coupe">Coupe</option>
                        <option value="Kabriolet">Kabriolet</option>
                        <option value="Monovolumen">Monovolumen (Van)</option>
                        <option value="Pickup">Pickup</option>
                        <option value="Terenac">Terenac</option>
                        <option value="Ostalo">Ostalo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Kilometraža *</label>
                    <input type="number" id="kilometraza" required placeholder="npr. 120000 km" min="0">
                </div>
                
                <div class="form-group">
                    <label>Godište *</label>
                    <input type="number" id="godiste" required placeholder="npr. 2015" min="1950" max="2026">
                </div>
                
                <div class="form-group">
                    <label>Registrovan *</label>
                    <select id="registrovan" required>
                        <option value="">Izaberi</option>
                        <option value="Da">Da</option>
                        <option value="Ne">Ne</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Registracija Važi Do</label>
                    <input type="text" id="registracija_do" placeholder="npr. 12/2025">
                </div>
                
                <div class="form-group">
                    <label>Gorivo *</label>
                    <select id="gorivo" required>
                        <option value="">Izaberi</option>
                        <option value="Benzin">Benzin</option>
                        <option value="Dizel">Dizel</option>
                        <option value="Plin (LPG)">Plin (LPG)</option>
                        <option value="Električni">Električni</option>
                        <option value="Hibrid">Hibrid</option>
                        <option value="Plug-in Hibrid">Plug-in Hibrid</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Kubikaža (ccm)</label>
                    <input type="number" id="kubikaza" placeholder="npr. 1600" min="0">
                </div>
                
                <div class="form-group">
                    <label>Snaga (KW)</label>
                    <input type="number" id="snaga_kw" placeholder="npr. 77" min="0">
                </div>
                
                <div class="form-group">
                    <label>Transmisija</label>
                    <select id="transmisija">
                        <option value="">Izaberi</option>
                        <option value="Manuelna">Manuelna</option>
                        <option value="Automatska">Automatska</option>
                        <option value="Poluautomatska">Poluautomatska</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Pogon</label>
                    <select id="pogon">
                        <option value="">Izaberi</option>
                        <option value="Prednji">Prednji</option>
                        <option value="Zadnji">Zadnji</option>
                        <option value="4x4">4x4 (Sve točkove)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Boja</label>
                    <select id="boja">
                        <option value="">Izaberi</option>
                        <option value="Crna">Crna</option>
                        <option value="Bijela">Bijela</option>
                        <option value="Siva">Siva</option>
                        <option value="Srebrna">Srebrna</option>
                        <option value="Plava">Plava</option>
                        <option value="Crvena">Crvena</option>
                        <option value="Zelena">Zelena</option>
                        <option value="Žuta">Žuta</option>
                        <option value="Narandžasta">Narandžasta</option>
                        <option value="Smeđa">Smeđa</option>
                        <option value="Ostalo">Ostalo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Broj Vrata</label>
                    <select id="broj_vrata">
                        <option value="">Izaberi</option>
                        <option value="2/3">2/3 vrata</option>
                        <option value="4/5">4/5 vrata</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Broj Sjedišta</label>
                    <select id="broj_sjedista">
                        <option value="">Izaberi</option>
                        <option value="2">2</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="7">7</option>
                        <option value="8+">8+</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Klima</label>
                    <select id="klima">
                        <option value="">Izaberi</option>
                        <option value="Nema">Nema</option>
                        <option value="Obična">Obična</option>
                        <option value="Automatska">Automatska</option>
                        <option value="Dual-zone">Dual-zone</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Stanje</label>
                    <select id="stanje_vozila">
                        <option value="">Izaberi</option>
                        <option value="Novo">Novo</option>
                        <option value="Kao novo">Kao novo</option>
                        <option value="Odlično">Odlično</option>
                        <option value="Dobro">Dobro</option>
                        <option value="Potreban remont">Potreban remont</option>
                        <option value="Havarisan">Havarisan</option>
                    </select>
                </div>
            </div>
        `;
    }
    else if (category === 'nekretnine') {
        html = `
            <div class="category-fields-box">
                <h3 style="color:#6C5CE7;margin-bottom:20px;font-size:1.3rem;">🏠 Dodatne Informacije - Nekretnina</h3>
                
                <div class="form-group">
                    <label>Tip Nekretnine *</label>
                    <select id="tip_nekretnine" required>
                        <option value="">Izaberi</option>
                        <option value="Stan">Stan</option>
                        <option value="Kuća">Kuća</option>
                        <option value="Plac">Plac</option>
                        <option value="Poslovni prostor">Poslovni prostor</option>
                        <option value="Kancelarija">Kancelarija</option>
                        <option value="Lokal">Lokal</option>
                        <option value="Garaža">Garaža</option>
                        <option value="Magacin">Magacin</option>
                        <option value="Vikendica">Vikendica</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Kvadratura (m²) *</label>
                    <input type="number" id="kvadratura" required placeholder="npr. 65" min="1">
                </div>
                
                <div class="form-group">
                    <label>Broj Soba</label>
                    <select id="broj_soba">
                        <option value="">Izaberi</option>
                        <option value="Garsonjera">Garsonjera</option>
                        <option value="1">Jednosoban</option>
                        <option value="1.5">Jednoiposoban</option>
                        <option value="2">Dvosoban</option>
                        <option value="2.5">Dvoiposoban</option>
                        <option value="3">Trosoban</option>
                        <option value="3.5">Troiposoban</option>
                        <option value="4">Četvorosoban</option>
                        <option value="5+">5+ soba</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Sprat</label>
                    <input type="text" id="sprat" placeholder="npr. 3/5, prizemlje, potkrovlje">
                </div>
                
                <div class="form-group">
                    <label>Broj Kupatila</label>
                    <select id="broj_kupatila">
                        <option value="">Izaberi</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3+">3+</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Grijanje</label>
                    <select id="grijanje">
                        <option value="">Izaberi</option>
                        <option value="Centralno">Centralno</option>
                        <option value="Etažno">Etažno</option>
                        <option value="TA peć">TA peć</option>
                        <option value="Klima">Klima</option>
                        <option value="Električno">Električno</option>
                        <option value="Nema">Nema</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Parking</label>
                    <select id="parking">
                        <option value="">Izaberi</option>
                        <option value="Da">Da</option>
                        <option value="Garaža">Garaža</option>
                        <option value="Ne">Ne</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Lift</label>
                    <select id="lift">
                        <option value="">Izaberi</option>
                        <option value="Da">Da</option>
                        <option value="Ne">Ne</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Balkon/Terasa</label>
                    <select id="balkon">
                        <option value="">Izaberi</option>
                        <option value="Balkon">Balkon</option>
                        <option value="Terasa">Terasa</option>
                        <option value="Balkon i Terasa">Balkon i Terasa</option>
                        <option value="Ne">Ne</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Namješten</label>
                    <select id="namjesten">
                        <option value="">Izaberi</option>
                        <option value="Da">Da</option>
                        <option value="Djelimično">Djelimično</option>
                        <option value="Ne">Ne</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Godina Izgradnje</label>
                    <input type="number" id="godina_izgradnje" placeholder="npr. 2010" min="1900" max="2026">
                </div>
                
                <div class="form-group">
                    <label>Stanje</label>
                    <select id="stanje_nekretnine">
                        <option value="">Izaberi</option>
                        <option value="Novogradnja">Novogradnja</option>
                        <option value="Kao novo">Kao novo</option>
                        <option value="Odlično">Odlično</option>
                        <option value="Dobro">Dobro</option>
                        <option value="Potrebna renovacija">Potrebna renovacija</option>
                    </select>
                </div>
            </div>
        `;
    }
    else if (category === 'telefoni') {
        html = `
            <div class="category-fields-box">
                <h3 style="color:#6C5CE7;margin-bottom:20px;font-size:1.3rem;">📱 Dodatne Informacije - Telefon</h3>
                
                <div class="form-group">
                    <label>Marka *</label>
                    <select id="marka" required>
                        <option value="">Izaberi</option>
                        <option value="Apple">Apple (iPhone)</option>
                        <option value="Samsung">Samsung</option>
                        <option value="Xiaomi">Xiaomi</option>
                        <option value="Huawei">Huawei</option>
                        <option value="OnePlus">OnePlus</option>
                        <option value="Google">Google Pixel</option>
                        <option value="Sony">Sony</option>
                        <option value="Nokia">Nokia</option>
                        <option value="Motorola">Motorola</option>
                        <option value="Oppo">Oppo</option>
                        <option value="Vivo">Vivo</option>
                        <option value="Realme">Realme</option>
                        <option value="Honor">Honor</option>
                        <option value="Ostalo">Ostalo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Model *</label>
                    <input type="text" id="model" required placeholder="npr. Galaxy S23, iPhone 14 Pro">
                </div>
                
                <div class="form-group">
                    <label>Memorija (GB) *</label>
                    <select id="memorija" required>
                        <option value="">Izaberi</option>
                        <option value="32">32 GB</option>
                        <option value="64">64 GB</option>
                        <option value="128">128 GB</option>
                        <option value="256">256 GB</option>
                        <option value="512">512 GB</option>
                        <option value="1024">1 TB</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>RAM (GB)</label>
                    <select id="ram">
                        <option value="">Izaberi</option>
                        <option value="2">2 GB</option>
                        <option value="3">3 GB</option>
                        <option value="4">4 GB</option>
                        <option value="6">6 GB</option>
                        <option value="8">8 GB</option>
                        <option value="12">12 GB</option>
                        <option value="16">16 GB</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Baterija (mAh)</label>
                    <input type="number" id="baterija" placeholder="npr. 4500" min="1000">
                </div>
                
                <div class="form-group">
                    <label>Kamera (MP)</label>
                    <input type="text" id="kamera" placeholder="npr. 108 MP, 50 MP + 12 MP">
                </div>
                
                <div class="form-group">
                    <label>Dijagonala Ekrana (inch)</label>
                    <input type="text" id="ekran" placeholder='npr. 6.7"'>
                </div>
                
                <div class="form-group">
                    <label>Operativni Sistem</label>
                    <select id="os">
                        <option value="">Izaberi</option>
                        <option value="Android">Android</option>
                        <option value="iOS">iOS</option>
                        <option value="HarmonyOS">HarmonyOS</option>
                        <option value="Ostalo">Ostalo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>5G</label>
                    <select id="5g">
                        <option value="">Izaberi</option>
                        <option value="Da">Da</option>
                        <option value="Ne">Ne</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Dual SIM</label>
                    <select id="dual_sim">
                        <option value="">Izaberi</option>
                        <option value="Da">Da</option>
                        <option value="Ne">Ne</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Stanje *</label>
                    <select id="stanje" required>
                        <option value="">Izaberi</option>
                        <option value="Novo">Novo (zapečaćeno)</option>
                        <option value="Kao novo">Kao novo</option>
                        <option value="Odlično">Odlično</option>
                        <option value="Dobro">Dobro</option>
                        <option value="Zadovoljavajuće">Zadovoljavajuće</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Garancija</label>
                    <select id="garancija">
                        <option value="">Izaberi</option>
                        <option value="Da">Da</option>
                        <option value="Ne">Ne</option>
                    </select>
                </div>
            </div>
        `;
    }
    else if (category === 'namjestaj') {
        html = `
            <div class="category-fields-box">
                <h3 style="color:#6C5CE7;margin-bottom:20px;font-size:1.3rem;">🪑 Dodatne Informacije - Namještaj</h3>
                
                <div class="form-group">
                    <label>Tip Namještaja *</label>
                    <select id="tip_namjestaja" required>
                        <option value="">Izaberi</option>
                        <option value="Krevet">Krevet</option>
                        <option value="Orman">Orman</option>
                        <option value="Sto">Sto</option>
                        <option value="Stolica">Stolica</option>
                        <option value="Fotelja">Fotelja</option>
                        <option value="Sofa">Sofa</option>
                        <option value="Komoda">Komoda</option>
                        <option value="Polica">Polica</option>
                        <option value="Garnitura">Garnitura</option>
                        <option value="Kuhinja">Kuhinja</option>
                        <option value="Ostalo">Ostalo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Materijal</label>
                    <select id="materijal">
                        <option value="">Izaberi</option>
                        <option value="Drvo">Drvo</option>
                        <option value="Metal">Metal</option>
                        <option value="Plastika">Plastika</option>
                        <option value="Koža">Koža</option>
                        <option value="Eko koža">Eko koža</option>
                        <option value="Tkanina">Tkanina</option>
                        <option value="Staklo">Staklo</option>
                        <option value="Kombinovano">Kombinovano</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Boja</label>
                    <input type="text" id="boja_namjestaja" placeholder="npr. Bijela, Smeđa, Crna">
                </div>
                
                <div class="form-group">
                    <label>Dimenzije</label>
                    <input type="text" id="dimenzije" placeholder="npr. 200x180cm, 120x80x75cm">
                </div>
                
                <div class="form-group">
                    <label>Stanje *</label>
                    <select id="stanje_namjestaja" required>
                        <option value="">Izaberi</option>
                        <option value="Novo">Novo</option>
                        <option value="Kao novo">Kao novo</option>
                        <option value="Odlično">Odlično</option>
                        <option value="Dobro">Dobro</option>
                        <option value="Zadovoljavajuće">Zadovoljavajuće</option>
                    </select>
                </div>
            </div>
        `;
    }
    else if (category === 'bijela_tehnika') {
        html = `
            <div class="category-fields-box">
                <h3 style="color:#6C5CE7;margin-bottom:20px;font-size:1.3rem;">❄️ Dodatne Informacije - Bijela Tehnika</h3>
                
                <div class="form-group">
                    <label>Tip Uređaja *</label>
                    <select id="tip_uredjaja" required>
                        <option value="">Izaberi</option>
                        <option value="Frižider">Frižider</option>
                        <option value="Zamrzivač">Zamrzivač</option>
                        <option value="Veš mašina">Veš mašina</option>
                        <option value="Sušilica">Sušilica</option>
                        <option value="Mašina za suđe">Mašina za suđe</option>
                        <option value="Šporet">Šporet</option>
                        <option value="Rerna">Rerna</option>
                        <option value="Mikrotalasna">Mikrotalasna</option>
                        <option value="Klima uređaj">Klima uređaj</option>
                        <option value="Bojler">Bojler</option>
                        <option value="Aspirator">Aspirator</option>
                        <option value="Ostalo">Ostalo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Marka *</label>
                    <input type="text" id="marka_tehnika" required placeholder="npr. Samsung, Bosch, LG">
                </div>
                
                <div class="form-group">
                    <label>Model</label>
                    <input type="text" id="model_tehnika" placeholder="Model uređaja">
                </div>
                
                <div class="form-group">
                    <label>Energetska Klasa</label>
                    <select id="energetska_klasa">
                        <option value="">Izaberi</option>
                        <option value="A+++">A+++</option>
                        <option value="A++">A++</option>
                        <option value="A+">A+</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Kapacitet</label>
                    <input type="text" id="kapacitet" placeholder="npr. 7kg, 250L">
                </div>
                
                <div class="form-group">
                    <label>Godina Proizvodnje</label>
                    <input type="number" id="godina_proizvodnje" placeholder="npr. 2020" min="1990" max="2026">
                </div>
                
                <div class="form-group">
                    <label>Stanje *</label>
                    <select id="stanje_tehnika" required>
                        <option value="">Izaberi</option>
                        <option value="Novo">Novo</option>
                        <option value="Kao novo">Kao novo</option>
                        <option value="Odlično">Odlično</option>
                        <option value="Dobro">Dobro</option>
                        <option value="Zadovoljavajuće">Zadovoljavajuće</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Garancija</label>
                    <select id="garancija_tehnika">
                        <option value="">Izaberi</option>
                        <option value="Da">Da</option>
                        <option value="Ne">Ne</option>
                    </select>
                </div>
            </div>
        `;
    }
    else if (category === 'alati') {
        html = `
            <div class="category-fields-box">
                <h3 style="color:#6C5CE7;margin-bottom:20px;font-size:1.3rem;">🔧 Dodatne Informacije - Alati</h3>
                
                <div class="form-group">
                    <label>Tip Alata *</label>
                    <select id="tip_alata" required>
                        <option value="">Izaberi</option>
                        <option value="Bušilica">Bušilica</option>
                        <option value="Brusilica">Brusilica</option>
                        <option value="Testera">Testera</option>
                        <option value="Odvijač">Odvijač</option>
                        <option value="Čekić">Čekić</option>
                        <option value="Mjerač">Mjerač</option>
                        <option value="Komplet alata">Komplet alata</option>
                        <option value="Vrtna tehnika">Vrtna tehnika</option>
                        <option value="Ostalo">Ostalo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Marka *</label>
                    <input type="text" id="marka_alat" required placeholder="npr. Bosch, Makita, DeWalt">
                </div>
                
                <div class="form-group">
                    <label>Model</label>
                    <input type="text" id="model_alat" placeholder="Model alata">
                </div>
                
                <div class="form-group">
                    <label>Napajanje</label>
                    <select id="napajanje">
                        <option value="">Izaberi</option>
                        <option value="Baterija">Baterija</option>
                        <option value="Mrežno">Mrežno</option>
                        <option value="Benzin">Benzin</option>
                        <option value="Pneumatski">Pneumatski</option>
                        <option value="Ručno">Ručno</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Snaga</label>
                    <input type="text" id="snaga_alat" placeholder="npr. 500W, 18V">
                </div>
                
                <div class="form-group">
                    <label>Stanje *</label>
                    <select id="stanje_alat" required>
                        <option value="">Izaberi</option>
                        <option value="Novo">Novo</option>
                        <option value="Kao novo">Kao novo</option>
                        <option value="Odlično">Odlično</option>
                        <option value="Dobro">Dobro</option>
                        <option value="Zadovoljavajuće">Zadovoljavajuće</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Garancija</label>
                    <select id="garancija_alat">
                        <option value="">Izaberi</option>
                        <option value="Da">Da</option>
                        <option value="Ne">Ne</option>
                    </select>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
};

console.log('✅ Category fields function loaded!');


// ========================================
// PERFORMANCE OPTIMIZATIONS
// ========================================

// Debounce function for search
let searchTimeout;
window.debouncedSearch = function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchAuctions();
    }, 300); // Wait 300ms after user stops typing
};

console.log('✅ Performance optimizations loaded');


// ========================================
// LIGHT MODE - STYLE CLEANUP
// ========================================

// Function to clean inline styles in light mode
function applyLightModeCleanup() {
    if (!document.body.classList.contains('light-mode')) return;
    
    // Clean hero banner (reklama na početnoj)
    const heroBanner = document.querySelector('.hero-banner');
    if (heroBanner) {
        heroBanner.style.background = 'white';
        heroBanner.style.backgroundImage = 'none';
        heroBanner.style.border = '2px solid #E3F2FD';
        heroBanner.style.borderImage = 'none';
    }
    
    // Clean upload box
    const uploadBox = document.querySelector('.upload-instructions-box');
    if (uploadBox) {
        uploadBox.style.background = 'white';
        uploadBox.style.backgroundImage = 'none';
        uploadBox.style.border = '2px solid #E3F2FD';
    }
    
    // Clean upload content
    const uploadContent = document.querySelector('.upload-instructions-content');
    if (uploadContent) {
        uploadContent.style.background = 'white';
        uploadContent.style.backgroundImage = 'none';
        uploadContent.style.border = 'none';
    }
    
    // Clean category boxes
    document.querySelectorAll('.category-fields-box').forEach(box => {
        box.style.background = 'white';
        box.style.backgroundImage = 'none';
        box.style.border = '2px solid #E3F2FD';
    });
    
    console.log('✅ Light mode cleanup applied');
}

// Run cleanup when DOM changes (for dynamic content)
const observer = new MutationObserver(() => {
    if (document.body.classList.contains('light-mode')) {
        applyLightModeCleanup();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});


// ========================================
// AUTO DELETE EXPIRED AUCTIONS
// ========================================

async function deleteExpiredAuctions() {
    if (!db) return;
    
    try {
        const now = Date.now();
        const snapshot = await db.collection('aukcije').get();
        
        let deletedCount = 0;
        const batch = db.batch();
        
        snapshot.forEach(doc => {
            const auction = doc.data();
            if (auction.endTime && auction.endTime < now) {
                // Auction expired
                batch.delete(doc.ref);
                deletedCount++;
            }
        });
        
        if (deletedCount > 0) {
            await batch.commit();
            console.log(`🗑️ Deleted ${deletedCount} expired auctions`);
        }
    } catch (err) {
        console.error('❌ Error deleting expired auctions:', err);
    }
}

// Run cleanup every 1 hour
setInterval(deleteExpiredAuctions, 60 * 60 * 1000);

// Run on load
setTimeout(deleteExpiredAuctions, 5000);

console.log('✅ Auto-delete expired auctions enabled');


// ========================================
// DELETE MY AUCTION
// ========================================

window.deleteMyAuction = async function(auctionId) {
    if (!currentUser || !db) return;
    
    if (!confirm('Da li ste sigurni da želite obrisati ovaj oglas?')) {
        return;
    }
    
    try {
        await db.collection('aukcije').doc(auctionId).delete();
        showToast('✅ Oglas uspješno obrisan!');
        
        // Reload my auctions
        loadMyAuctions();
    } catch (err) {
        console.error('❌ Error deleting auction:', err);
        showToast('Greška pri brisanju oglasa', 'error');
    }
};

console.log('✅ Delete my auction function loaded');


// ========================================
// RATING SYSTEM - USER TO USER
// ========================================

window.rateUser = async function(userId, rating, comment) {
    if (!currentUser || !db) {
        showToast('Morate biti prijavljeni!');
        return;
    }
    
    if (userId === currentUser.uid) {
        showToast('Ne možete ocjeniti sebe!', 'error');
        return;
    }
    
    try {
        await db.collection('ratings').add({
            fromUserId: currentUser.uid,
            fromUserName: currentUser.displayName || currentUser.email,
            toUserId: userId,
            rating: rating, // 1-5
            comment: comment || '',
            timestamp: Date.now()
        });
        
        showToast('✅ Ocjena poslana!');
    } catch (err) {
        console.error('❌ Rating error:', err);
        showToast('Greška pri slanju ocjene', 'error');
    }
};

// ========================================
// SIMPLE CHAT SYSTEM
// ========================================

window.openChat = function(userId, userName) {
    if (!currentUser) {
        showToast('Morate biti prijavljeni!');
        openAuthModal('login');
        return;
    }
    
    if (userId === currentUser.uid) {
        showToast('Ne možete razgovarati sa sobom!', 'error');
        return;
    }
    
    const container = document.getElementById('modalContainer');
    container.innerHTML = `
        <div class="modal active" id="modalOverlay" onclick="closeModalOnOverlay(event)">
            <div class="modal-content" style="max-width:500px;">
                <button class="modal-close" onclick="closeModal()">×</button>
                <h2 class="modal-title">💬 Chat sa ${userName}</h2>
                
                <div id="chatMessages" style="height:400px;overflow-y:auto;background:#0F1629;border-radius:10px;padding:15px;margin:20px 0;">
                    <div style="text-align:center;color:#888;padding:40px;">
                        <div class="splash-loader" style="margin:0 auto;"></div>
                        <p style="margin-top:20px;">Učitavam poruke...</p>
                    </div>
                </div>
                
                <div style="display:flex;gap:10px;">
                    <input type="text" id="chatInput" placeholder="Napišite poruku..." 
                           style="flex:1;padding:12px;background:#1A1F38;border:2px solid #2A3150;border-radius:8px;color:white;"
                           onkeypress="if(event.key==='Enter') sendChatMessage('${userId}')">
                    <button onclick="sendChatMessage('${userId}')" class="btn-submit" style="padding:12px 24px;">
                        Pošalji
                    </button>
                </div>
                
                <div style="margin-top:15px;padding:15px;background:rgba(108,92,231,0.1);border-radius:8px;">
                    <p style="font-size:0.85rem;color:#888;">
                        💡 <strong>Savjet:</strong> Budite pristojni i poštujte pravila platforme.
                    </p>
                </div>
            </div>
        </div>
    `;
    
    loadChatMessages(userId);
};

async function loadChatMessages(otherUserId) {
    if (!db || !currentUser) return;
    
    const messagesDiv = document.getElementById('chatMessages');
    
    try {
        const chatId = [currentUser.uid, otherUserId].sort().join('_');
        
        const snapshot = await db.collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(50)
            .get();
        
        if (snapshot.empty) {
            messagesDiv.innerHTML = `
                <div style="text-align:center;color:#888;padding:40px;">
                    <p style="font-size:2rem;margin-bottom:10px;">💬</p>
                    <p>Još nema poruka</p>
                    <p style="font-size:0.85rem;margin-top:10px;">Budite prvi koji će poslati poruku!</p>
                </div>
            `;
            return;
        }
        
        messagesDiv.innerHTML = snapshot.docs.map(doc => {
            const msg = doc.data();
            const isMine = msg.fromUserId === currentUser.uid;
            const time = new Date(msg.timestamp).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div style="display:flex;justify-content:${isMine ? 'flex-end' : 'flex-start'};margin-bottom:10px;">
                    <div style="max-width:70%;background:${isMine ? '#6C5CE7' : '#2A3150'};padding:10px 15px;border-radius:12px;">
                        <p style="margin:0;color:white;">${msg.text}</p>
                        <p style="margin:5px 0 0;font-size:0.75rem;color:rgba(255,255,255,0.6);">${time}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        // Scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
    } catch (err) {
        console.error('❌ Chat error:', err);
        messagesDiv.innerHTML = `
            <div style="text-align:center;color:#F44336;padding:40px;">
                <p>Greška pri učitavanju poruka</p>
            </div>
        `;
    }
}

window.sendChatMessage = async function(otherUserId) {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text) return;
    if (!currentUser || !db) return;
    
    try {
        const chatId = [currentUser.uid, otherUserId].sort().join('_');
        
        await db.collection('chats')
            .doc(chatId)
            .collection('messages')
            .add({
                fromUserId: currentUser.uid,
                fromUserName: currentUser.displayName || currentUser.email,
                text: text,
                timestamp: Date.now()
            });
        
        input.value = '';
        loadChatMessages(otherUserId);
        
    } catch (err) {
        console.error('❌ Send error:', err);
        showToast('Greška pri slanju poruke', 'error');
    }
};

console.log('✅ Chat and rating system loaded');


// ========================================
// QUICK AD CREATION
// ========================================

window.createQuickAd = async function(event) {
    event.preventDefault();
    
    if (!currentUser || !db) {
        showToast('Morate biti prijavljeni!');
        return;
    }
    
    if (selectedFiles.length === 0) {
        showToast('Dodajte bar jednu sliku!', 'error');
        return;
    }
    
    // Max 8 images
    if (selectedFiles.length > 8) {
        showToast('⚠️ Maksimalno 8 slika!', 'error');
        return;
    }
    
    try {
        showToast('Objavljivanje...');
        
        // Get form values
        const naslov = document.getElementById('quickTitle')?.value?.trim();
        const opis = document.getElementById('quickDesc')?.value?.trim();
        const cijena = parseFloat(document.getElementById('quickPrice')?.value);
        const lokacija = document.getElementById('quickLocation')?.value?.trim();
        
        // Basic validation
        if (!naslov) {
            showToast('⚠️ Unesite naslov', 'error');
            return;
        }
        if (!opis) {
            showToast('⚠️ Unesite opis', 'error');
            return;
        }
        if (!cijena || cijena <= 0) {
            showToast('⚠️ Unesite cijenu', 'error');
            return;
        }
        if (!lokacija) {
            showToast('⚠️ Unesite lokaciju', 'error');
            return;
        }
        
        // Upload to Imgur (free image hosting)
        const imageUrls = [];
        
        for (let i = 0; i < selectedFiles.length; i++) {
            showToast(`Slika ${i + 1}/${selectedFiles.length}...`);
            
            const compressed = await compressImage(selectedFiles[i]);
            
            // Upload to Imgur
            const formData = new FormData();
            const blob = await fetch(compressed).then(r => r.blob());
            formData.append('image', blob);
            
            const response = await fetch('https://api.imgur.com/3/image', {
                method: 'POST',
                headers: {
                    'Authorization': 'Client-ID 534e4c5c3e4aa62'
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                imageUrls.push(data.data.link);
                console.log(`✅ Uploaded ${i + 1}: ${data.data.link}`);
            } else {
                throw new Error('Imgur upload failed');
            }
        }
        
        // Create auction
        const auctionData = {
            naslov: naslov,
            opis: opis,
            cijena: cijena,
            lokacija: lokacija,
            kategorija: 'ostalo',
            slike: imageUrls,
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Korisnik',
            verified: false,
            isVIP: false,
            rating: 5,
            bids: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            endTime: Date.now() + (30 * 24 * 60 * 60 * 1000),
            views: 0,
            active: true
        };
        
        console.log('📤 Creating auction with', imageUrls.length, 'Storage images');
        
        await db.collection('aukcije').add(auctionData);
        
        showToast('✅ Oglas objavljen!');
        selectedFiles = [];
        loadAuctions();
        showPage('home');
        
    } catch (err) {
        console.error('❌ Error:', err);
        showToast('Greška: ' + (err.message || 'Pokušajte ponovo'), 'error');
    }
};


// ========================================
// MODERN THEME TOGGLE ICON UPGRADE
// ========================================

function updateModernThemeIcon() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    
    const isDark = !document.body.classList.contains('light-mode');
    
    if (isDark) {
        // Moon icon - minimal modern design
        toggle.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        `;
        toggle.style.color = '#00D9FF';
    } else {
        // Sun icon - minimal modern design
        toggle.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
        `;
        toggle.style.color = '#FF3366';
    }
}

// Call on load and theme change
setTimeout(updateModernThemeIcon, 100);

// Override toggleTheme to update icon
const originalToggleTheme = window.toggleTheme;
window.toggleTheme = function() {
    document.body.classList.toggle('light-mode');
    
    const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    
    updateModernThemeIcon();
    
    console.log('Theme:', theme);
};

console.log('✅ Modern theme toggle icons loaded');


// ========================================
// ADDITIONAL FEATURES - Safe & Useful
// ========================================

// 1. SHARE TO SOCIAL - Quick share button
window.shareToSocial = function(auctionId, title, price) {
    const url = window.location.origin + '?auction=' + auctionId;
    const text = `Pogledaj: ${title} - ${price}€ na eAukcija.me`;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile && navigator.share) {
        // Native share (mobile)
        navigator.share({
            title: title,
            text: text,
            url: url
        }).catch(err => console.log('Share canceled'));
    } else {
        // Copy to clipboard (desktop)
        navigator.clipboard.writeText(text + '\n' + url).then(() => {
            showToast('✅ Link kopiran! Podijeli gdje želiš');
        });
    }
};

// 2. SAVE TO FAVORITES - Quick save
window.quickSaveToFavorites = function(auctionId) {
    if (!currentUser) {
        showToast('Prijavi se za čuvanje favorita!');
        openAuthModal('login');
        return;
    }
    
    const userRef = db.collection('users').doc(currentUser.uid);
    
    userRef.get().then(doc => {
        let favorites = [];
        if (doc.exists && doc.data().favorites) {
            favorites = doc.data().favorites;
        }
        
        if (favorites.includes(auctionId)) {
            // Remove from favorites
            favorites = favorites.filter(id => id !== auctionId);
            showToast('❤️ Uklonjeno iz favorita');
        } else {
            // Add to favorites
            favorites.push(auctionId);
            showToast('❤️ Dodato u favorite!');
        }
        
        userRef.set({ favorites }, { merge: true });
    });
};

// 3. REPORT AUCTION - Flag inappropriate content
window.reportAuction = function(auctionId) {
    if (!currentUser) {
        showToast('Prijavi se za prijavljivanje');
        return;
    }
    
    const reason = prompt('Razlog prijave:\n1. Neprikladan sadržaj\n2. Prevara\n3. Netačne informacije\n4. Ostalo');
    
    if (reason) {
        // Send report via email
        const subject = encodeURIComponent('Prijava oglasa - eAukcija.me');
        const body = encodeURIComponent(
            `Oglas ID: ${auctionId}\n` +
            `Korisnik: ${currentUser.email}\n` +
            `Razlog: ${reason}\n\n` +
            `Molimo provjerite ovaj oglas.`
        );
        
        window.location.href = `mailto:eaukcijame@gmail.com?subject=${subject}&body=${body}`;
        showToast('📧 Email klijent otvoren');
    }
};

// 4. PRINT AUCTION - For record keeping
window.printAuction = function(auctionId) {
    const auction = allAuctions.find(a => a.id === auctionId);
    if (!auction) return;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>${auction.naslov} - eAukcija.me</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #00D9FF; }
                .info { margin: 10px 0; }
                img { max-width: 100%; height: auto; }
            </style>
        </head>
        <body>
            <h1>${auction.naslov}</h1>
            <div class="info"><strong>Cijena:</strong> ${auction.cijena}€</div>
            <div class="info"><strong>Lokacija:</strong> ${auction.lokacija}</div>
            <div class="info"><strong>Opis:</strong> ${auction.opis}</div>
            <img src="${auction.slike[0]}" alt="${auction.naslov}">
            <p style="margin-top:20px;color:#888;">Odštampano sa eAukcija.me</p>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};

console.log('✅ Additional features loaded: Share, Favorites, Report, Print');