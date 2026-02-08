// ═══════════════════════════════════════════════════════════
// eAUKCIJA.me - KOMPLETNA APLIKACIJA
// SVE FUNKCIONALNOSTI - BEZ GREŠKE
// ═══════════════════════════════════════════════════════════

const firebaseConfig = {
    apiKey: "AIzaSyDNRI9Rk7CjckhSeFngeEwzxheNl4EwhE4",
    authDomain: "eaukcija-cfed6.firebaseapp.com",
    projectId: "eaukcija-cfed6",
    storageBucket: "eaukcija-cfed6.firebasestorage.app",
    messagingSenderId: "773592461426",
    appId: "1:773592461426:web:ad3ff038317dcfb5b6d2eb"
};

// ADMIN EMAIL - SAMO VI IMATE PRISTUP
const ADMIN_EMAIL = "radomirkuc2@gmail.com";

const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
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
        
        console.log('✅ Firebase povezan');
        initApp();
    } catch (err) {
        console.error('Firebase greška:', err);
        alert('Greška pri povezivanju. Osvježite stranicu.');
    }
})();

// SPLASH SCREEN
setTimeout(() => {
    const s = document.getElementById('splash');
    if (s) {
        s.style.opacity = '0';
        setTimeout(() => s.remove(), 500);
    }
}, 3000);

function initApp() {
    auth.onAuthStateChanged(async user => {
        currentUser = user;
        updateAuthUI();
        
        if (user) {
            // Check if admin
            if (user.email === ADMIN_EMAIL) {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
            }
            await loadUserData();
        }
    });

    loadAuctions();
    setupFileUpload();
    setupFilters();
}

function updateAuthUI() {
    document.getElementById('loginBtn').style.display = currentUser ? 'none' : 'block';
    document.getElementById('regBtn').style.display = currentUser ? 'none' : 'block';
    document.getElementById('logoutBtn').style.display = currentUser ? 'block' : 'none';
}

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════

function openAuth(mode) {
    isRegMode = mode === 'register';
    document.getElementById('authTitle').textContent = isRegMode ? 'REGISTRACIJA' : 'PRIJAVA';
    document.getElementById('authBtn').textContent = isRegMode ? 'REGISTRUJ SE' : 'PRIJAVI SE';
    document.getElementById('regFields').style.display = isRegMode ? 'block' : 'none';
    document.getElementById('forgotLink').style.display = isRegMode ? 'none' : 'block';
    document.getElementById('authToggle').innerHTML = isRegMode ?
        'Već imate nalog? <span style="color:var(--secondary);font-weight:700;">Prijavite se</span>' :
        'Nemate nalog? <span style="color:var(--secondary);font-weight:700;">Registrujte se</span>';
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
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    try {
        if (isRegMode) {
            const name = document.getElementById('authName').value.trim();
            const phone = document.getElementById('authPhone').value.trim();
            
            if (!name || !phone) {
                alert('❌ Popunite sva polja!');
                return;
            }

            const cred = await auth.createUserWithEmailAndPassword(email, password);
            
            // Send email verification
            await cred.user.sendEmailVerification();
            
            await db.collection('users').doc(cred.user.uid).set({
                name, phone, email,
                createdAt: Date.now(),
                isVIP: false,
                verified: false,
                activityScore: 0,
                rating: 5,
                ratingCount: 0
            });
            
            alert('✅ Uspješna registracija!\n\nProvjerite email za potvrdu naloga.');
            closeAuth();
            document.getElementById('authForm').reset();
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            alert('✅ Uspješno ste prijavljeni!');
            closeAuth();
            document.getElementById('authForm').reset();
        }
    } catch (err) {
        console.error('Auth greška:', err);
        let msg = 'Greška: ';
        if (err.code === 'auth/email-already-in-use') msg = 'Email već postoji!';
        else if (err.code === 'auth/weak-password') msg = 'Lozinka mora imati minimum 6 karaktera!';
        else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') msg = 'Pogrešan email ili lozinka!';
        else msg = err.message;
        alert('❌ ' + msg);
    }
}

function resetPassword() {
    const email = prompt('Unesite vašu email adresu:');
    if (!email) return;
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert('✅ Link za reset lozinke poslat na email!\n\nProvjerite inbox i spam folder.');
        })
        .catch(err => {
            alert('❌ Greška: ' + err.message);
        });
}

function logout() {
    if (confirm('Da li ste sigurni da želite da se odjavite?')) {
        auth.signOut();
        location.reload();
    }
}

async function loadUserData() {
    if (!currentUser) return;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            const score = doc.data().activityScore || 0;
            const scoreEl = document.getElementById('myActivityScore');
            if (scoreEl) scoreEl.textContent = score;
        }
    } catch (err) {
        console.error('Greška:', err);
    }
}

// ═══════════════════════════════════════════════════════════
// FILE UPLOAD - 10 SLIKA IZ GALERIJE
// ═══════════════════════════════════════════════════════════

function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadArea || !fileInput) return;
    
    uploadArea.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handleFiles(e.target.files);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        uploadArea.addEventListener(evt, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    
    uploadArea.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
}

function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    
    const files = Array.from(fileList).slice(0, 10);
    selectedFiles = files;
    
    const grid = document.getElementById('previewGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    files.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" class="preview-img">
                <button class="remove-btn" onclick="removePreview(${i})" type="button">×</button>
            `;
            grid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
    
    updateImageCount();
}

function removePreview(i) {
    selectedFiles.splice(i, 1);
    handleFiles(selectedFiles);
}

function updateImageCount() {
    const el = document.getElementById('imageCount');
    if (el) {
        el.textContent = `${selectedFiles.length}/10 slika`;
        el.style.color = selectedFiles.length === 0 ? 'var(--muted)' : 'var(--success)';
    }
}

// ═══════════════════════════════════════════════════════════
// PUBLISH AUCTION
// ═══════════════════════════════════════════════════════════

async function publishAuction(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('❌ Morate biti prijavljeni!');
        openAuth('login');
        return;
    }

    const kat = document.getElementById('u-kat').value;
    const naslov = document.getElementById('u-naslov').value.trim();
    const opis = document.getElementById('u-opis').value.trim();
    const cijena = document.getElementById('u-cijena').value;
    const lokacija = document.getElementById('u-lokacija').value.trim();
    const trajanje = document.getElementById('u-trajanje').value;

    if (!kat || !naslov || !opis || !cijena || !lokacija || selectedFiles.length === 0) {
        alert('❌ Popunite sva polja i dodajte barem 1 sliku!');
        return;
    }

    try {
        let images = [];
        for (let file of selectedFiles) {
            const base64 = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            images.push(base64);
        }

        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data() || {};

        const endTime = Date.now() + (Number(trajanje) * 60 * 60 * 1000);

        await db.collection('aukcije').add({
            kategorija: kat,
            naslov,
            opis,
            cijena: Number(cijena),
            lokacija,
            slike: images,
            timestamp: Date.now(),
            endTime,
            userId: currentUser.uid,
            userName: userData.name || 'Korisnik',
            userPhone: userData.phone || '',
            verified: userData.verified || false,
            isVIP: userData.isVIP || false,
            rating: userData.rating || 5,
            bids: [],
            views: 0,
            active: true
        });

        await db.collection('users').doc(currentUser.uid).update({
            activityScore: (userData.activityScore || 0) + 1
        });

        alert('✅ Aukcija uspješno objavljena!\n\nTrajanje: ' + trajanje + ' sati');
        
        document.getElementById('auctionForm').reset();
        selectedFiles = [];
        document.getElementById('previewGrid').innerHTML = '';
        updateImageCount();
        
        showSection('aktivni');
    } catch (err) {
        console.error('Greška:', err);
        alert('❌ Greška: ' + err.message);
    }
}

// ═══════════════════════════════════════════════════════════
// LOAD AUCTIONS - TRAJNO ČUVANJE (30 DANA)
// ═══════════════════════════════════════════════════════════

function loadAuctions() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    db.collection('aukcije')
        .where('timestamp', '>', thirtyDaysAgo)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .onSnapshot(snap => {
            allAuctions = [];
            snap.forEach(doc => {
                const data = doc.data();
                // Check if still active
                const isActive = data.endTime > Date.now();
                allAuctions.push({ id: doc.id, ...data, isActive });
            });
            displayAuctions();
        });
}

function displayAuctions() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    let filtered = allAuctions.filter(a => {
        const catMatch = currentCat === 'all' || a.kategorija === currentCat;
        const isActive = a.isActive !== false;
        return catMatch && isActive;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty"><div style="font-size:60px;opacity:0.3;">📦</div><p>Nema aktivnih aukcija</p></div>';
        return;
    }

    grid.innerHTML = '';
    filtered.forEach(a => grid.appendChild(createAuctionCard(a)));
}

function createAuctionCard(a) {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => openDetail(a.id);
    
    const icons = {
        'automobili':'🚗','nekretnine':'🏠','namjestaj':'🪑',
        'tehnika':'⚡','alati':'🔧','telefoni':'📱'
    };

    let badges = '';
    if (a.isVIP) badges += '<span class="badge badge-vip">VIP</span>';
    if (a.verified) badges += '<span class="badge badge-verified">✓</span>';

    const stars = '⭐'.repeat(Math.round(a.rating || 5));
    
    // Timer countdown
    const timeLeft = a.endTime - Date.now();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const timerText = hoursLeft > 0 ? `⏰ ${hoursLeft}h ${minutesLeft}m` : `⏰ ${minutesLeft}m`;

    card.innerHTML = `
        <div style="position:relative;">
            <img src="${a.slike[0]}" class="card-img" loading="lazy">
            ${a.slike.length > 1 ? `<div class="img-badge">📸 ${a.slike.length}</div>` : ''}
            <div class="timer-badge">${timerText}</div>
        </div>
        <div class="card-body">
            <div class="seller">
                <div class="avatar">${a.userName ? a.userName[0].toUpperCase() : '?'}</div>
                <div class="seller-info">
                    <div class="seller-name">${a.userName || 'Korisnik'} ${badges}</div>
                    <div class="rating">${stars}</div>
                    <div class="seller-meta">${icons[a.kategorija] || '📦'} ${a.lokacija}</div>
                </div>
            </div>
            <h3 class="title">${a.naslov}</h3>
            <div class="price">${a.cijena.toLocaleString()} €</div>
            <div class="meta">
                <span>💰 ${a.bids?.length || 0} ponuda</span>
                <span>👁️ ${a.views || 0}</span>
            </div>
        </div>
    `;
    return card;
}

// ═══════════════════════════════════════════════════════════
// AUCTION DETAIL WITH IMAGE GALLERY
// ═══════════════════════════════════════════════════════════

function openDetail(id) {
    const a = allAuctions.find(x => x.id === id);
    if (!a) return;

    db.collection('aukcije').doc(id).update({ views: (a.views || 0) + 1 });

    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    
    const isOwner = currentUser && currentUser.uid === a.userId;
    
    const timeLeft = a.endTime - Date.now();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    let imagesHTML = '<div class="detail-images">';
    a.slike.forEach((img, i) => {
        imagesHTML += `<img src="${img}" onclick="openGallery(${i}, '${id}')" style="width:100px;height:100px;object-fit:cover;margin:5px;cursor:pointer;border-radius:8px;">`;
    });
    imagesHTML += '</div>';

    content.innerHTML = `
        <h2 style="margin-bottom:15px;">${a.naslov}</h2>
        ${imagesHTML}
        <div class="timer-display">⏰ Preostalo: ${hoursLeft}h ${minutesLeft}m</div>
        <p style="margin:15px 0;line-height:1.6;">${a.opis}</p>
        <div class="price" style="text-align:center;margin:20px 0;">${a.cijena.toLocaleString()} €</div>
        <p><strong>📍 Lokacija:</strong> ${a.lokacija}</p>
        <p><strong>👤 Prodavac:</strong> ${a.userName}</p>
        <p><strong>📱 Telefon:</strong> ${a.userPhone}</p>
        <p><strong>💰 Trenutnih ponuda:</strong> ${a.bids?.length || 0}</p>
        ${!isOwner ? `
            <input type="number" id="bidAmount" placeholder="Unesite vašu ponudu (€)" min="${a.cijena + 1}" style="margin-top:15px;">
            <button class="btn" onclick="placeBid('${id}')">DAJTE PONUDU</button>
        ` : `
            <div style="margin-top:20px;">
                <button class="btn" onclick="deleteAuction('${id}')" style="background:var(--accent);">🗑️ OBRIŠI OGLAS</button>
            </div>
        `}
    `;

    modal.classList.add('active');
}

function closeDetail() {
    document.getElementById('detailModal').classList.remove('active');
}

function openGallery(index, auctionId) {
    const a = allAuctions.find(x => x.id === auctionId);
    if (!a) return;

    const modal = document.getElementById('galleryModal');
    const content = document.getElementById('galleryContent');
    
    content.innerHTML = `
        <div style="text-align:center;">
            <img src="${a.slike[index]}" style="max-width:100%;max-height:70vh;border-radius:10px;">
            <div style="margin-top:20px;">
                ${a.slike.map((img, i) => `
                    <img src="${img}" onclick="openGallery(${i}, '${auctionId}')" 
                         style="width:80px;height:80px;object-fit:cover;margin:5px;cursor:pointer;border-radius:5px;border:${i === index ? '3px solid var(--secondary)' : '2px solid var(--border)'};">
                `).join('')}
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeGallery() {
    document.getElementById('galleryModal').classList.remove('active');
}

async function placeBid(auctionId) {
    if (!currentUser) {
        alert('❌ Prijavite se!');
        openAuth('login');
        return;
    }

    const amount = document.getElementById('bidAmount').value;
    if (!amount || amount < 1) {
        alert('❌ Unesite validnu ponudu!');
        return;
    }

    try {
        const auction = allAuctions.find(x => x.id === auctionId);
        const bids = auction.bids || [];
        
        bids.push({
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Korisnik',
            amount: Number(amount),
            timestamp: Date.now()
        });

        // Reduce time if multiple bids
        let newEndTime = auction.endTime;
        if (bids.length > 3) {
            newEndTime = Math.min(newEndTime, Date.now() + (2 * 60 * 60 * 1000)); // Max 2h
        }

        await db.collection('aukcije').doc(auctionId).update({
            bids,
            endTime: newEndTime,
            cijena: Number(amount)
        });

        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        await db.collection('users').doc(currentUser.uid).update({
            activityScore: (userDoc.data().activityScore || 0) + 1
        });

        alert('✅ Ponuda uspješno data!');
        closeDetail();
    } catch (err) {
        alert('❌ Greška: ' + err.message);
    }
}

async function deleteAuction(id) {
    if (!confirm('Obrisati oglas?')) return;
    try {
        await db.collection('aukcije').doc(id).delete();
        alert('✅ Oglas obrisan!');
        closeDetail();
    } catch (err) {
        alert('❌ ' + err.message);
    }
}

// ═══════════════════════════════════════════════════════════
// MY AUCTIONS
// ═══════════════════════════════════════════════════════════

async function loadMyAuctions() {
    if (!currentUser) return;
    const lista = document.getElementById('mojiOglasiLista');
    if (!lista) return;
    
    try {
        const snap = await db.collection('aukcije').where('userId', '==', currentUser.uid).get();
        if (snap.empty) {
            lista.innerHTML = '<p style="text-align:center;padding:40px;color:var(--muted);">Nemate oglasa</p>';
            return;
        }
        
        lista.innerHTML = '';
        snap.forEach(doc => {
            const a = { id: doc.id, ...doc.data() };
            const div = document.createElement('div');
            div.style.cssText = 'background:var(--bg);padding:15px;border-radius:10px;margin-bottom:10px;cursor:pointer;';
            div.onclick = () => openDetail(a.id);
            div.innerHTML = `
                <h4>${a.naslov}</h4>
                <p style="color:var(--success);font-weight:700;margin-top:5px;">${a.cijena} €</p>
                <p style="font-size:12px;color:var(--muted);margin-top:5px;">👁️ ${a.views || 0} • 💰 ${a.bids?.length || 0} ponuda</p>
            `;
            lista.appendChild(div);
        });
    } catch (err) {
        lista.innerHTML = '<p style="text-align:center;color:var(--accent);">Greška</p>';
    }
}

// ═══════════════════════════════════════════════════════════
// FILTERS & SEARCH
// ═══════════════════════════════════════════════════════════

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCat = this.dataset.cat;
            displayAuctions();
        });
    });
}

function searchAuctions() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!query) { displayAuctions(); return; }
    
    const grid = document.getElementById('grid');
    const filtered = allAuctions.filter(a => 
        a.naslov.toLowerCase().includes(query) ||
        a.opis?.toLowerCase().includes(query) ||
        a.lokacija.toLowerCase().includes(query)
    );
    
    grid.innerHTML = '';
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty"><p>Nema rezultata</p></div>';
    } else {
        filtered.forEach(a => grid.appendChild(createAuctionCard(a)));
    }
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').style.display = 
        document.getElementById('sidebar').classList.contains('active') ? 'block' : 'none';
}

function showSection(id) {
    const sections = ['aktivni','dodaj','moje','vip','premium','sugestije','chat','donacije','nagrade','uslovi','admin'];
    sections.forEach(s => {
        const el = document.getElementById('sec-' + s);
        if (el) el.style.display = s === id ? 'block' : 'none';
    });
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navMap = {'aktivni':0,'dodaj':1,'moje':2,'nagrade':3};
    if (navMap[id] !== undefined) {
        document.querySelectorAll('.nav-item')[navMap[id]].classList.add('active');
    }
    
    toggleMenu();
    
    if (id === 'moje' && currentUser) loadMyAuctions();
    if (id === 'admin' && currentUser) loadAdminPanel();
    
    if (['dodaj','moje'].includes(id) && !currentUser) {
        alert('❌ Prijavite se!');
        openAuth('login');
        showSection('aktivni');
    }
}

// ═══════════════════════════════════════════════════════════
// DONATIONS & SUGGESTIONS
// ═══════════════════════════════════════════════════════════

let selectedDonationAmount = 0;

function selectDonation(amount) {
    selectedDonationAmount = amount;
    document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function processDonation() {
    const custom = document.getElementById('customDonation').value;
    const amount = custom || selectedDonationAmount;
    if (!amount || amount < 1) {
        alert('❌ Izaberite iznos!');
        return;
    }
    alert(`❤️ Hvala na donaciji od ${amount}€!\n\nKontakt za plaćanje:\n📱 +382 63 493 850\n📧 donate@eaukcija.me`);
}

function posaljiSugestiju() {
    const text = document.getElementById('sugestijaText').value.trim();
    if (!text) {
        alert('❌ Unesite sugestiju!');
        return;
    }
    
    if (!currentUser) {
        alert('❌ Prijavite se!');
        return;
    }
    
    db.collection('sugestije').add({
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Korisnik',
        text,
        timestamp: Date.now()
    }).then(() => {
        alert('✅ Sugestija poslata! Hvala vam!');
        document.getElementById('sugestijaText').value = '';
    });
}

function contactForPayment(type) {
    alert(`💳 ${type} Plaćanje\n\nKontaktirajte nas:\n📱 +382 63 493 850\n📧 payment@eaukcija.me\n\nNakon uplate, vaš ${type} status će biti aktiviran u roku od 24h.`);
}

// ═══════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════

async function loadAdminPanel() {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return;
    showAdminTab('pending');
}

async function showAdminTab(tab) {
    const lista = document.getElementById('adminList');
    if (!lista) return;
    
    lista.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        let query = db.collection('aukcije');
        if (tab === 'pending') {
            query = query.where('active', '==', false);
        }
        
        const snap = await query.orderBy('timestamp', 'desc').limit(50).get();
        
        if (snap.empty) {
            lista.innerHTML = '<p style="text-align:center;padding:40px;">Nema oglasa</p>';
            return;
        }
        
        lista.innerHTML = '';
        snap.forEach(doc => {
            const a = { id: doc.id, ...doc.data() };
            const div = document.createElement('div');
            div.style.cssText = 'background:var(--bg);padding:15px;border-radius:10px;margin-bottom:10px;';
            div.innerHTML = `
                <h4>${a.naslov}</h4>
                <p style="font-size:13px;margin:5px 0;">Korisnik: ${a.userName} (${a.userPhone})</p>
                <p style="font-size:13px;margin:5px 0;">Cijena: ${a.cijena}€</p>
                <div style="margin-top:10px;display:flex;gap:10px;">
                    <button class="btn" style="flex:1;background:var(--success);" onclick="approveAuction('${a.id}')">✓ Odobri</button>
                    <button class="btn" style="flex:1;background:var(--accent);" onclick="rejectAuction('${a.id}')">✗ Odbij</button>
                    <button class="btn" style="flex:1;background:var(--muted);" onclick="deleteAuction('${a.id}')">🗑️ Obriši</button>
                </div>
            `;
            lista.appendChild(div);
        });
    } catch (err) {
        lista.innerHTML = '<p style="text-align:center;color:var(--accent);">Greška</p>';
    }
}

async function approveAuction(id) {
    try {
        await db.collection('aukcije').doc(id).update({ active: true });
        alert('✅ Oglas odobren!');
        loadAdminPanel();
    } catch (err) {
        alert('❌ ' + err.message);
    }
}

async function rejectAuction(id) {
    if (!confirm('Odbiti oglas?')) return;
    try {
        await db.collection('aukcije').doc(id).delete();
        alert('✅ Oglas odbijen i obrisan!');
        loadAdminPanel();
    } catch (err) {
        alert('❌ ' + err.message);
    }
}

// SERVICE WORKER
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

console.log('🚀 eAukcija.me - Aplikacija pokrenuta!');