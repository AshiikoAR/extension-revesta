/**
 * Script de la page d'options
 */

// Éléments du formulaire
const form = document.getElementById('optionsForm');
const saveMessage = document.getElementById('saveMessage');

// Charger les options sauvegardées
document.addEventListener('DOMContentLoaded', loadOptions);

/**
 * Charger les options depuis le stockage
 */
async function loadOptions() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['userConfig'], (result) => {
            const config = result.userConfig || {};

            // Remplir le formulaire
            document.getElementById('statut').value = config.statut || 'propriétaire';
            document.getElementById('codePostal').value = config.codePostal || '';
            document.getElementById('revenus').value = config.revenus || '25000';
            document.getElementById('nombrePersonnes').value = config.nombrePersonnes || '3';
            document.getElementById('residencePrincipale').value = config.residencePrincipale || 'oui';
            document.getElementById('dpeActuel').value = config.dpeActuel || '6';
            document.getElementById('dpeVise').value = config.dpeVise || '2';
            
            // Informations de contact
            document.getElementById('nom').value = config.nom || '';
            document.getElementById('prenom').value = config.prenom || '';
            document.getElementById('email').value = config.email || '';
            
            document.getElementById('budgetAchat').value = config.budgetAchat || '';
            document.getElementById('surfaceLogement').value = config.surfaceLogement || '';
            document.getElementById('periodeConstruction').value = config.periodeConstruction || 'au moins 15 ans';
            document.getElementById('budgetTravaux').value = config.budgetTravaux || '';
            document.getElementById('taxeFonciere').value = config.taxeFonciere || '';
            document.getElementById('gainEnergetique').value = config.gainEnergetique || '2';
            document.getElementById('typeLogement').value = config.typeLogement || 'maison';
            document.getElementById('parcoursAide').value = config.parcoursAide || 'accompagné';
            document.getElementById('conditionDepenses').checked = config.conditionDepenses !== false;
            document.getElementById('notificationsAides').checked = config.notificationsAides !== false;
            document.getElementById('notificationsPrix').checked = config.notificationsPrix !== false;
            document.getElementById('acceptAnalytics').checked = config.acceptAnalytics !== false;

            // Restaurer les cases cochées
            if (config.travaux && Array.isArray(config.travaux)) {
                config.travaux.forEach(travail => {
                    const checkbox = document.querySelector(`input[name="travaux"][value="${travail}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            resolve();
        });
    });
}

/**
 * Sauvegarder les options
 */
form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Récupérer les valeurs cochées des travaux
    const travauxCheckboxes = document.querySelectorAll('input[name="travaux"]:checked');
    const travaux = Array.from(travauxCheckboxes).map(cb => cb.value);

    const config = {
        statut: document.getElementById('statut').value,
        codePostal: document.getElementById('codePostal').value,
        revenus: parseInt(document.getElementById('revenus').value) || 25000,
        nombrePersonnes: parseInt(document.getElementById('nombrePersonnes').value) || 3,
        residencePrincipale: document.getElementById('residencePrincipale').value,
        dpeActuel: parseInt(document.getElementById('dpeActuel').value) || 6,
        dpeVise: parseInt(document.getElementById('dpeVise').value) || 2,
        
        // Informations de contact
        nom: document.getElementById('nom').value.trim() || '',
        prenom: document.getElementById('prenom').value.trim() || '',
        email: document.getElementById('email').value.trim() || '',
        
        budgetAchat: parseInt(document.getElementById('budgetAchat').value) || null,
        surfaceLogement: parseInt(document.getElementById('surfaceLogement').value) || null,
        periodeConstruction: document.getElementById('periodeConstruction').value,
        budgetTravaux: parseInt(document.getElementById('budgetTravaux').value) || null,
        taxeFonciere: parseInt(document.getElementById('taxeFonciere').value) || null,
        gainEnergetique: document.getElementById('gainEnergetique').value,
        typeLogement: document.getElementById('typeLogement').value,
        parcoursAide: document.getElementById('parcoursAide').value,
        conditionDepenses: document.getElementById('conditionDepenses').checked,
        travaux: travaux,
        notificationsAides: document.getElementById('notificationsAides').checked,
        notificationsPrix: document.getElementById('notificationsPrix').checked,
        acceptAnalytics: document.getElementById('acceptAnalytics').checked
    };

    // Valider le code postal
    if (!config.codePostal || config.codePostal.length !== 5 || !/^\d{5}$/.test(config.codePostal)) {
        showMessage('Le code postal doit contenir 5 chiffres', 'error');
        return;
    }

    // Sauvegarder dans Chrome Storage
    chrome.storage.sync.set({ userConfig: config }, () => {
        if (chrome.runtime.lastError) {
            showMessage('Erreur lors de la sauvegarde', 'error');
        } else {
            showMessage('Vos paramètres ont été enregistrés avec succès !', 'success');
            
            // Notifier le background worker
            chrome.runtime.sendMessage(
                { type: 'SAVE_USER_CONFIG', config: config },
                () => console.log('Background notifié')
            );
        }
    });
});

/**
 * Supprimer les données
 */
document.getElementById('deleteData').addEventListener('click', () => {
    if (confirm('⚠️ Êtes-vous sûr ? Vos données seront supprimées définitivement.')) {
        chrome.storage.sync.remove(['userConfig'], () => {
            form.reset();
            showMessage('Vos données ont été supprimées', 'success');
        });
    }
});

/**
 * Afficher un message
 */
function showMessage(message, type = 'success') {
    saveMessage.textContent = (type === 'error' ? '❌ ' : '✅ ') + message;
    saveMessage.className = `message ${type}`;
    
    // Cacher le message après 4 secondes
    setTimeout(() => {
        saveMessage.classList.add('hidden');
    }, 4000);
}

/**
 * Validation en temps réel du code postal
 */
document.getElementById('codePostal').addEventListener('blur', (e) => {
    const value = e.target.value;
    if (value && (value.length !== 5 || !/^\d{5}$/.test(value))) {
        e.target.style.borderColor = '#f44336';
    } else {
        e.target.style.borderColor = '#ddd';
    }
});
