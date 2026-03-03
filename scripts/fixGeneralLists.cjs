
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc, updateDoc, arrayUnion } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function repairGeneralLists() {
    console.log("Iniciando reparación de listas General...");

    // Obtenemos todas las listas llamadas General
    const q = query(collection(db, 'lists'), where('name', '==', 'General'));
    const snapshot = await getDocs(q);

    // Agrupamos por usuario por si hay más casos
    const userGroups = {};
    snapshot.docs.forEach(d => {
        const data = d.data();
        const uid = data.ownerId;
        if (!userGroups[uid]) userGroups[uid] = [];
        userGroups[uid].push({ id: d.id, ...data });
    });

    for (const uid in userGroups) {
        const lists = userGroups[uid];
        if (lists.length > 1) {
            console.log(`Usuario ${uid} tiene ${lists.length} listas General. Consolidando...`);

            // Elegimos una como principal (la que tenga isDefault o la más vieja)
            lists.sort((a, b) => (a.isDefault ? -1 : 1));
            const mainList = lists[0];
            const extras = lists.slice(1);

            for (const extra of extras) {
                console.log(`- Fusionando lista ${extra.id} en ${mainList.id}`);
                // Mover películas si tiene
                if (extra.movies && extra.movies.length > 0) {
                    const mainRef = doc(db, 'lists', mainList.id);
                    for (const movie of extra.movies) {
                        await updateDoc(mainRef, {
                            movies: arrayUnion(movie)
                        });
                    }
                }
                // Borrar la extra
                await deleteDoc(doc(db, 'lists', extra.id));
                console.log(`- Lista duplicada ${extra.id} eliminada.`);
            }
        } else if (lists.length === 1 && !lists[0].isDefault) {
            // Aseguramos que tenga el flag isDefault
            await updateDoc(doc(db, 'lists', lists[0].id), { isDefault: true });
            console.log(`- Marcada lista General de ${uid} como default.`);
        }
    }
    console.log("Reparación finalizada.");
    process.exit(0);
}

repairGeneralLists().catch(err => {
    console.error(err);
    process.exit(1);
});
