const firebaseConfig = {
    apiKey: "AIzaSyDNRI9Rk7CjckhSeFngeEwzxheNl4EwhE4",
    authDomain: "eaukcija-cfed6.firebaseapp.com",
    projectId: "eaukcija-cfed6",
    storageBucket: "eaukcija-cfed6.firebasestorage.app",
    messagingSenderId: "773592461426",
    appId: "1:773592461426:web:ad3ff038317dcfb5b6d2eb"
};

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
        
        console.log('✅ Firebase OK');
        initApp();
    } catch (err) {
        console.error('Firebase greška:', err);
    }
})();

setTimeout(() => {
    const s = document.getElementById('splash');
    if (s) {
        s.style.opacity = '0';
        setTimeout(() => s.remove(), 500);
    }
}, 3000);

function initApp() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        document.getElementById('loginBtn').style.display = user ? 'none' : 'block';
        document.getElementById('regBtn').style.display = user ? 'none' : 'block';
        document.getElementById('logoutBtn').style.display = user ? 'block' : 'none';
    });

    db.collection('aukcije').orderBy('timestamp', 'desc').limit(50).onSnapshot(snap => {
        allAuctions = [];
        snap.forEach(doc => allAuctions.push({ id: doc.id, ...doc.data() }));
        displayAuctions();
    });

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadArea && fileInput) {
        uploadArea.onclick = () => fileInput.click();
        fileInput.onchange = (e) => handleFiles(e.target.files);
    }

    if (!localStorage.getItem('cookiesAccepted')) {
        const banner = document.getElementById('cookieBanner');
        if (banner) banner.style.display = 'block';
    }
}

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
            const terms = document.getElementById('acceptTerms');
            
            if (!name || !phone) { alert('❌ Popunite sve!'); return; }
            if (!terms.checked) { alert('❌ Prihvatite uslove!'); return; }

            const cred = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection('users').doc(cred.user.uid).set({
                name, phone, email, createdAt: Date.now(), isVIP: false, verified: false
            });
            alert('✅ Uspješno!');
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            alert('✅ Prijavljeni!');
        }
        closeAuth();
        document.getElementById('authForm').reset();
    } catch (err) {
        alert('❌ ' + err.message);
    }
}

function logout() {
    auth.signOut();
    location.reload();
}

function handleFiles(files) {
    selectedFiles = Array.from(files).slice(0, 10);
    const grid = document.getElementById('previewGrid');
    grid.innerHTML = '';
    selectedFiles.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `<img src="${e.target.result}" class="preview-img"><button class="remove-btn" onclick="removePreview(${i})">×</button>`;
            grid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function removePreview(i) {
    selectedFiles.splice(i, 1);
    handleFiles(selectedFiles);
}

async function publishAuction() {
    if (!currentUser) { alert('❌ Prijavite se!'); openAuth('login'); return; }

    const kat = document.getElementById('u-kat').value;
    const n = document.getElementById('u-n').value;
    const opis = document.getElementById('u-opis').value;
    const c = document.getElementById('u-c').value;
    const lok = document.getElementById('u-lok').value;

    if (!kat || !n || !c || !lok || selectedFiles.length === 0) {
        alert('❌ Popunite sve i dodajte slike!');
        return;
    }

    try {
        let imgs = [];
        for (let f of selectedFiles) {
            const b64 = await new Promise(r => {
                const reader = new FileReader();
                reader.onload = e => r(e.target.result);
                reader.readAsDataURL(f);
            });
            imgs.push(b64);
        }

        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data() || {};

        await db.collection('aukcije').add({
            kategorija: kat, naslov: n, opis, cijena: Number(c), lokacija: lok, slike: imgs,
            timestamp: Date.now(), userId: currentUser.uid, userName: userData.name || 'Korisnik',
            userPhone: userData.phone || '', verified: userData.verified || false,
            isVIP: userData.isVIP || false, bids: [], views: 0
        });

        alert('✅ Objavljeno!');
        document.getElementById('u-kat').value = '';
        document.getElementById('u-n').value = '';
        document.getElementById('u-opis').value = '';
        document.getElementById('u-c').value = '';
        document.getElementById('u-lok').value = '';
        selectedFiles = [];
        document.getElementById('previewGrid').innerHTML = '';
        showSec('feed');
    } catch (err) {
        alert('❌ ' + err.message);
    }
}

function displayAuctions() {
    const grid = document.getElementById('grid');
    let filtered = allAuctions.filter(a => currentCat === 'all' || a.kategorija === currentCat);

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty"><div class="empty-icon">📦</div><p>Nema aukcija</p></div>';
        return;
    }

    grid.innerHTML = '';
    filtered.forEach(a => {
        const icons = {'automobili':'🚗','nekretnine':'🏠','namjestaj':'🪑','tehnika':'⚡'};
        let badges = '';
        if (a.isVIP) badges += '<span class="badge badge-vip">VIP</span>';
        if (a.verified) badges += '<span class="badge badge-verified">✓</span>';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="position:relative;">
                <img src="${a.slike[0]}" class="card-img">
                ${a.slike.length > 1 ? `<div class="img-badge">📸 ${a.slike.length}</div>` : ''}
            </div>
            <div class="card-body">
                <div class="seller">
                    <div class="avatar">${a.userName ? a.userName[0].toUpperCase() : '?'}</div>
                    <div class="seller-info">
                        <div class="seller-name">${a.userName || 'Korisnik'} ${badges}</div>
                        <div class="seller-meta">${icons[a.kategorija] || '📦'} ${a.kategorija} • ${a.lokacija}</div>
                    </div>
                </div>
                <h3 class="title">${a.naslov}</h3>
                ${a.opis ? `<p class="desc">${a.opis.substring(0, 80)}...</p>` : ''}
                <div class="price">${a.cijena.toLocaleString()} €</div>
                <div class="meta">
                    <span>💰 ${a.bids?.length || 0}</span>
                    <span>👁️ ${a.views || 0}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterCat(cat) {
    currentCat = cat;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    displayAuctions();
}

function searchAuctions() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    if (!q) { displayAuctions(); return; }
    const grid = document.getElementById('grid');
    const filtered = allAuctions.filter(a => a.naslov.toLowerCase().includes(q) || a.opis?.toLowerCase().includes(q));
    grid.innerHTML = '';
    if (filtered.length === 0) grid.innerHTML = '<div class="empty"><p>Nema rezultata</p></div>';
    else filtered.forEach(a => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="position:relative;"><img src="${a.slike[0]}" class="card-img"></div>
            <div class="card-body">
                <h3 class="title">${a.naslov}</h3>
                <div class="price">${a.cijena} €</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').style.display = document.getElementById('sidebar').classList.contains('active') ? 'block' : 'none';
}

function showSec(id) {
    ['feed', 'dodaj', 'vip', 'uslovi', 'privatnost'].forEach(s => {
        const el = document.getElementById('sec-' + s);
        if (el) el.style.display = s === id ? 'block' : 'none';
    });
    toggleMenu();
    if (id === 'dodaj' && !currentUser) {
        alert('❌ Prijavite se!');
        openAuth('login');
        showSec('feed');
    }
}

function acceptCookies() {
    localStorage.setItem('cookiesAccepted', 'true');
    document.getElementById('cookieBanner').style.display = 'none';
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

console.log('🚀 eAukcija.me RADI!');