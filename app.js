// ═══════════════════════════════════════════════════════════
// eAUKCIJA.me - JAVASCRIPT
// FIKSOBAN UPLOAD IZ GALERIJE - 10 SLIKA ODJEDNOM
// ═══════════════════════════════════════════════════════════

const firebaseConfig = {
    apiKey: "AIzaSyDNRI9Rk7CjckhSeFngeEwzxheNl4EwhE4",
    authDomain: "eaukcija-cfed6.firebaseapp.com",
    projectId: "eaukcija-cfed6",
    storageBucket: "eaukcija-cfed6.firebasestorage.app",
    messagingSenderId: "773592461426",
    appId: "1:773592461426:web:ad3ff038317dcfb5b6d2eb"
};

// Load Firebase SDK
const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
});

let db, auth, currentUser, isRegMode = false, currentCat = 'all', selectedFiles = [], allAuctions = [];

(async () => {
    try {
        await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js');
        
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        
        console.log('✅ Firebase inicijalizovan');
        initApp();
    } catch (err) {
        console.error('Firebase greška:', err);
    }
})();

// SPLASH SCREEN
setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 500);
    }
}, 3000);

function initApp() {
    // Auth listener
    auth.onAuthStateChanged(user => {
        currentUser = user;
        document.getElementById('loginBtn').style.display = user ? 'none' : 'block';
        document.getElementById('regBtn').style.display = user ? 'none' : 'block';
        document.getElementById('logoutBtn').style.display = user ? 'block' : 'none';
        if (user) loadMyScore();
    });

    // Load auctions - REAL TIME, NE BRIŠU SE
    db.collection('aukcije').orderBy('timestamp', 'desc').limit(100).onSnapshot(snap => {
        allAuctions = [];
        snap.forEach(doc => allAuctions.push({ id: doc.id, ...doc.data() }));
        displayAuctions();
        console.log('📦 Učitano', allAuctions.length, 'aukcija');
    });

    // FILE UPLOAD SETUP - GALERIJA
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadArea && fileInput) {
        // Click na area otvara file picker
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Kada korisnik izabere slike
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
        
        // Drag & drop podrška
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.style.borderColor = 'var(--secondary)';
                uploadArea.style.background = 'rgba(0, 217, 255, 0.1)';
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.style.borderColor = 'var(--border)';
                uploadArea.style.background = 'linear-gradient(135deg, rgba(108, 92, 231, 0.05), rgba(0, 217, 255, 0.05))';
            });
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        });
    }
}

// ═══════════════════════════════════════════════════════════
// FILE UPLOAD - 10 SLIKA IZ GALERIJE
// ═══════════════════════════════════════════════════════════

function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) {
        console.log('❌ Nema odabranih slika');
        return;
    }
    
    console.log('📸 Odabrano slika:', fileList.length);
    
    // Uzmi prvih 10 slika
    const files = Array.from(fileList).slice(0, 10);
    selectedFiles = files;
    
    console.log('✅ Prihvaćeno slika:', selectedFiles.length);
    
    // Prikaži preview
    displayPreviews();
    
    // Update brojač
    updateImageCount();
}

function displayPreviews() {
    const grid = document.getElementById('previewGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" class="preview-img" alt="Preview ${index + 1}">
                <button class="remove-btn" onclick="removePreview(${index})" type="button">×</button>
            `;
            grid.appendChild(div);
            
            console.log('✅ Preview slika', index + 1, 'prikazan');
        };
        
        reader.onerror = (err) => {
            console.error('❌ Greška pri čitanju slike', index, ':', err);
        };
        
        reader.readAsDataURL(file);
    });
}

function removePreview(index) {
    console.log('🗑️ Brisanje slike', index);
    selectedFiles.splice(index, 1);
    displayPreviews();
    updateImageCount();
}

function updateImageCount() {
    const countEl = document.getElementById('imageCount');
    if (countEl) {
        countEl.textContent = `${selectedFiles.length}/10 slika`;
        if (selectedFiles.length === 0) {
            countEl.style.color = 'var(--muted)';
        } else if (selectedFiles.length === 10) {
            countEl.style.color = 'var(--success)';
        } else {
            countEl.style.color = 'var(--secondary)';
        }
    }
}

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════

function openAuth(mode) {
    isRegMode = mode === 'register';
    document.getElementById('authTitle').textContent = isRegMode ? 'REGISTRACIJA' : 'PRIJAVA';
    document.getElementById('authBtn').textContent = isRegMode ? 'REGISTRUJ SE' : 'PRIJAVI SE';
    document.getElementById('regFields').style.display = isRegMode ? 'block' : 'none';
    document.getElementById('authModal').classList.add('active');
}

function closeAuth() {
    document.getElementById('authModal').classList.remove('active');
}

function toggleAuthMode() {
    openAuth(isRegMode ? 'login' : 'register');
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    try {
        if (isRegMode) {
            const name = document.getElementById('authName').value;
            const phone = document.getElementById('authPhone').value;
            
            if (!name || !phone) {
                alert('❌ Popunite sva polja!');
                return;
            }

            const cred = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection('users').doc(cred.user.uid).set({
                name, phone, email,
                createdAt: Date.now(),
                isVIP: false,
                verified: false,
                rating: 5,
                ratingCount: 0,
                activityScore: 0
            });
            
            alert('✅ Uspješna registracija!');
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            alert('✅ Uspješna prijava!');
        }
        
        closeAuth();
        document.getElementById('authForm').reset();
    } catch (err) {
        console.error('Auth greška:', err);
        alert('❌ ' + err.message);
    }
}

function logout() {
    if (confirm('Da li ste sigurni da želite da se odjavite?')) {
        auth.signOut();
        location.reload();
    }
}

// ═══════════════════════════════════════════════════════════
// PUBLISH AUCTION
// ═══════════════════════════════════════════════════════════

async function publishAuction() {
    if (!currentUser) {
        alert('❌ Morate biti prijavljeni!');
        openAuth('login');
        return;
    }

    const kat = document.getElementById('u-kat').value;
    const naslov = document.getElementById('u-n').value;
    const opis = document.getElementById('u-opis').value;
    const cijena = document.getElementById('u-c').value;
    const lokacija = document.getElementById('u-lok').value;

    if (!kat || !naslov || !cijena || !lokacija) {
        alert('❌ Popunite sva obavezna polja!');
        return;
    }
    
    if (selectedFiles.length === 0) {
        alert('❌ Dodajte barem 1 sliku!');
        return;
    }

    try {
        console.log('📤 Objavljivanje aukcije sa', selectedFiles.length, 'slika...');
        
        // Convert images to base64
        let images = [];
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            console.log(`📸 Procesiranje slike ${i + 1}/${selectedFiles.length}...`);
            
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });
            
            images.push(base64);
        }
        
        console.log('✅ Sve slike konvertovane');

        // Get user data
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data() || {};

        // Create auction
        await db.collection('aukcije').add({
            kategorija: kat,
            naslov: naslov.trim(),
            opis: opis.trim(),
            cijena: Number(cijena),
            lokacija: lokacija.trim(),
            slike: images,
            timestamp: Date.now(),
            userId: currentUser.uid,
            userName: userData.name || 'Korisnik',
            userPhone: userData.phone || '',
            verified: userData.verified || false,
            isVIP: userData.isVIP || false,
            rating: userData.rating || 5,
            bids: [],
            views: 0
        });

        // Update activity score
        await db.collection('users').doc(currentUser.uid).update({
            activityScore: (userData.activityScore || 0) + 1
        });

        console.log('✅ Aukcija objavljena!');
        alert('✅ Aukcija uspješno objavljena!');
        
        // Reset form
        document.getElementById('u-kat').value = '';
        document.getElementById('u-n').value = '';
        document.getElementById('u-opis').value = '';
        document.getElementById('u-c').value = '';
        document.getElementById('u-lok').value = '';
        selectedFiles = [];
        displayPreviews();
        updateImageCount();
        
        showSec('feed');
    } catch (err) {
        console.error('❌ Greška:', err);
        alert('❌ Greška pri objavljivanju: ' + err.message);
    }
}

// ═══════════════════════════════════════════════════════════
// DISPLAY AUCTIONS
// ═══════════════════════════════════════════════════════════

function displayAuctions() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    let filtered = allAuctions.filter(a => currentCat === 'all' || a.kategorija === currentCat);

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty"><div style="font-size:60px;opacity:0.3;margin-bottom:15px;">📦</div><p>Nema aukcija u ovoj kategoriji</p></div>';
        return;
    }

    grid.innerHTML = '';
    
    filtered.forEach(auction => {
        const card = createAuctionCard(auction);
        grid.appendChild(card);
    });
}

function createAuctionCard(a) {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => openDetail(a.id);
    
    const icons = {
        'automobili': '🚗',
        'nekretnine': '🏠',
        'namjestaj': '🪑',
        'tehnika': '⚡',
        'alati': '🔧',
        'telefoni': '📱'
    };

    let badges = '';
    if (a.isVIP) badges += '<span class="badge badge-vip">VIP</span>';
    if (a.verified) badges += '<span class="badge badge-verified">✓</span>';

    const stars = '⭐'.repeat(Math.round(a.rating || 5));

    card.innerHTML = `
        <div style="position:relative;">
            <img src="${a.slike[0]}" class="card-img" loading="lazy" alt="${a.naslov}">
            ${a.slike.length > 1 ? `<div class="img-badge">📸 ${a.slike.length}</div>` : ''}
        </div>
        <div class="card-body">
            <div class="seller">
                <div class="avatar">${a.userName ? a.userName.charAt(0).toUpperCase() : '?'}</div>
                <div class="seller-info">
                    <div class="seller-name">${a.userName || 'Korisnik'} ${badges}</div>
                    <div class="rating">${stars}</div>
                    <div class="seller-meta">${icons[a.kategorija] || '📦'} ${a.lokacija}</div>
                </div>
            </div>
            <h3 class="title">${a.naslov}</h3>
            ${a.opis ? `<p class="desc">${a.opis.substring(0, 100)}${a.opis.length > 100 ? '...' : ''}</p>` : ''}
            <div class="price">${a.cijena.toLocaleString()} €</div>
            <div class="meta">
                <span>💰 ${a.bids?.length || 0} ponuda</span>
                <span>👁️ ${a.views || 0}</span>
            </div>
        </div>
    `;

    return card;
}

function openDetail(id) {
    const a = allAuctions.find(x => x.id === id);
    if (!a) return;

    // Increment views
    db.collection('aukcije').doc(id).update({
        views: (a.views || 0) + 1
    });

    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    
    const isOwner = currentUser && currentUser.uid === a.userId;

    content.innerHTML = `
        <h2 style="margin-bottom:15px;">${a.naslov}</h2>
        <p style="color:var(--muted);margin-bottom:15px;line-height:1.6;">${a.opis || 'Bez opisa'}</p>
        <div class="price" style="text-align:center;margin:20px 0;">${a.cijena.toLocaleString()} €</div>
        <p style="margin:10px 0;"><strong>📍 Lokacija:</strong> ${a.lokacija}</p>
        <p style="margin:10px 0;"><strong>👤 Prodavac:</strong> ${a.userName}</p>
        <p style="margin:10px 0;"><strong>📱 Telefon:</strong> ${a.userPhone}</p>
        ${isOwner ? `
            <div style="margin-top:20px;">
                <button class="btn" onclick="deleteAuction('${id}')" style="background:var(--accent);">🗑️ OBRIŠI OGLAS</button>
            </div>
        ` : `
            <div style="margin-top:20px;">
                <button class="btn" onclick="alert('Chat funkcionalnost dolazi uskoro!')" style="background:var(--secondary);">💬 POŠALJI PORUKU</button>
            </div>
        `}
    `;

    modal.classList.add('active');
}

function closeDetail() {
    document.getElementById('detailModal').classList.remove('active');
}

async function deleteAuction(id) {
    if (!confirm('Da li ste sigurni da želite da obrišete ovaj oglas?')) return;
    
    try {
        await db.collection('aukcije').doc(id).delete();
        alert('✅ Oglas uspješno obrisan!');
        closeDetail();
    } catch (err) {
        alert('❌ Greška: ' + err.message);
    }
}

// ═══════════════════════════════════════════════════════════
// MY AUCTIONS
// ═══════════════════════════════════════════════════════════

async function loadMyAuctions() {
    if (!currentUser) return;
    
    const lista = document.getElementById('mojiLista');
    if (!lista) return;
    
    try {
        const snap = await db.collection('aukcije')
            .where('userId', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .get();
        
        if (snap.empty) {
            lista.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;">Nemate objavljenih oglasa</p>';
            return;
        }
        
        lista.innerHTML = '';
        snap.forEach(doc => {
            const a = { id: doc.id, ...doc.data() };
            const div = document.createElement('div');
            div.style.cssText = 'background:var(--bg);padding:15px;border-radius:10px;margin-bottom:10px;cursor:pointer;transition:all 0.3s;';
            div.onmouseover = () => div.style.background = 'var(--border)';
            div.onmouseout = () => div.style.background = 'var(--bg)';
            div.onclick = () => openDetail(a.id);
            div.innerHTML = `
                <h4 style="margin-bottom:8px;">${a.naslov}</h4>
                <p style="color:var(--success);font-weight:700;margin-top:5px;">${a.cijena.toLocaleString()} €</p>
                <p style="color:var(--muted);font-size:12px;margin-top:5px;">👁️ ${a.views || 0} pregleda</p>
            `;
            lista.appendChild(div);
        });
    } catch (err) {
        console.error('Greška:', err);
        lista.innerHTML = '<p style="text-align:center;color:var(--accent);padding:40px;">Greška pri učitavanju</p>';
    }
}

async function loadMyScore() {
    if (!currentUser) return;
    
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            const score = doc.data().activityScore || 0;
            const el = document.getElementById('myScore');
            if (el) el.textContent = score;
        }
    } catch (err) {
        console.error('Greška:', err);
    }
}

// ═══════════════════════════════════════════════════════════
// FILTERS & SEARCH
// ═══════════════════════════════════════════════════════════

function filterCat(cat) {
    currentCat = cat;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    displayAuctions();
}

function searchAuctions() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!query) {
        displayAuctions();
        return;
    }
    
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    const filtered = allAuctions.filter(a => 
        a.naslov.toLowerCase().includes(query) ||
        a.opis?.toLowerCase().includes(query) ||
        a.lokacija.toLowerCase().includes(query)
    );
    
    grid.innerHTML = '';
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty"><div style="font-size:60px;opacity:0.3;margin-bottom:15px;">🔍</div><p>Nema rezultata pretrage</p></div>';
    } else {
        filtered.forEach(a => grid.appendChild(createAuctionCard(a)));
    }
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) {
        overlay.style.display = sidebar && sidebar.classList.contains('active') ? 'block' : 'none';
    }
}

function showSec(id) {
    const sections = ['feed', 'dodaj', 'moje', 'chat', 'nagrade', 'verify', 'donacije'];
    
    sections.forEach(sec => {
        const el = document.getElementById('sec-' + sec);
        if (el) el.style.display = sec === id ? 'block' : 'none';
    });
    
    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navMap = {'feed':0, 'dodaj':1, 'moje':2, 'nagrade':3};
    if (navMap[id] !== undefined) {
        document.querySelectorAll('.nav-item')[navMap[id]].classList.add('active');
    }
    
    toggleMenu();
    
    // Load section data
    if (id === 'moje' && currentUser) loadMyAuctions();
    if (id === 'nagrade' && currentUser) loadMyScore();
    
    // Auth required sections
    if ((id === 'dodaj' || id === 'moje') && !currentUser) {
        alert('❌ Morate biti prijavljeni!');
        openAuth('login');
        showSec('feed');
    }
    
    window.scrollTo(0, 0);
}

// ═══════════════════════════════════════════════════════════
// DONATIONS
// ═══════════════════════════════════════════════════════════

let selectedDonation = 0;

function selectAmount(amount) {
    selectedDonation = amount;
    document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function processDonation() {
    const customAmount = document.getElementById('customAmount');
    const amount = customAmount && customAmount.value ? customAmount.value : selectedDonation;
    
    if (!amount || amount < 1) {
        alert('❌ Molimo izaberite ili unesite iznos donacije!');
        return;
    }
    
    alert(`❤️ Hvala vam na donaciji od ${amount}€!\n\nZa donaciju kontaktirajte:\n📱 +382 63 493 850\n📧 donate@eaukcija.me`);
}

// ═══════════════════════════════════════════════════════════
// SERVICE WORKER
// ═══════════════════════════════════════════════════════════

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('✅ Service Worker registrovan'))
            .catch(err => console.log('SW greška:', err));
    });
}

console.log('🚀 eAukcija.me - Aplikacija pokrenuta!');
console.log('✅ Firebase: Povezano');
console.log('✅ Upload: 10 slika iz galerije podržano');