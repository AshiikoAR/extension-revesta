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
            document.getElementById('codePostal').value = config.codePostal || '';
            document.getElementById('revenus').value = config.revenus || '';
            document.getElementById('nombrePersonnes').value = config.nombrePersonnes || '1';
            document.getElementById('typeProjet').value = config.typeProjet || 'achat';
            document.getElementById('typeLogement').value = config.typeLogement || 'maison';
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
        codePostal: document.getElementById('codePostal').value,
        revenus: parseInt(document.getElementById('revenus').value) || 0,
        nombrePersonnes: parseInt(document.getElementById('nombrePersonnes').value) || 1,
        typeProjet: document.getElementById('typeProjet').value,
        typeLogement: document.getElementById('typeLogement').value,
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
