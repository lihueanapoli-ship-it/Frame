import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import {
    getFirestore, connectFirestoreEmulator, doc, collection, query, where,
    getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch,
    runTransaction, arrayRemove, serverTimestamp, setLogLevel, terminate
} from 'firebase/firestore';
import { getMissingProfileFields } from '../src/utils/profile.js';

// This suite can only connect to a local emulator with a disposable demo project.
const projectId = 'demo-frame-rules';
const address = process.env.FIRESTORE_EMULATOR_HOST;
assert.match(address || '', /^(127\.0\.0\.1|localhost):\d+$/,
    'Run with firebase emulators:exec --only firestore --project demo-frame-rules --config firebase.emulators.json');
const [host, port] = address.split(':');
setLogLevel('silent');
const clients = [];
function client(uid) {
    const app = initializeApp({ projectId, apiKey: 'demo-key' }, uid || 'anonymous');
    const db = getFirestore(app);
    connectFirestoreEmulator(db, host, Number(port), uid ? { mockUserToken: { sub: uid, user_id: uid } } : {});
    clients.push({ app, db });
    return db;
}
const alice = client('alice');
const bob = client('bob');
const eve = client('eve');
const anonymous = client();
const denied = promise => assert.rejects(promise, { code: 'permission-denied' });
const invitation = (fromUid, toUid) => ({ fromUid, toUid, status: 'pending' });

before(async () => {
    const cleared = await fetch(`http://${address}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: 'DELETE' });
    assert.equal(cleared.status, 200);
    await setDoc(doc(alice, 'users/alice'), { uid: 'alice', displayName: 'Alice' });
    await setDoc(doc(bob, 'users/bob'), { uid: 'bob', displayName: 'Bob' });
});

after(async () => {
    await Promise.all(clients.map(async ({ app, db }) => {
        await terminate(db);
        await deleteApp(app);
    }));
});

test('users: authenticated discovery; only the document owner can create, update or delete', async () => {
    assert.equal((await getDoc(doc(bob, 'users/alice'))).data().displayName, 'Alice');
    await denied(getDoc(doc(anonymous, 'users/alice')));
    await denied(getDocs(collection(anonymous, 'users')));
    await denied(setDoc(doc(anonymous, 'users/anonymous'), { displayName: 'Anonymous' }));
    await denied(setDoc(doc(bob, 'users/forged'), { uid: 'forged' }));
    await denied(updateDoc(doc(bob, 'users/alice'), { bio: 'forged' }));
    await denied(deleteDoc(doc(bob, 'users/alice')));
    await updateDoc(doc(alice, 'users/alice'), { bio: 'My films' });
    await setDoc(doc(eve, 'users/eve'), { uid: 'eve' });
    await deleteDoc(doc(eve, 'users/eve'));
});

test('profile initialization preserves edited fields, preferences and existing movie data', async () => {
    const ref = doc(alice, 'users/alice');
    await setDoc(ref, {
        uid: 'alice', displayName: 'Edited name', username: 'edited',
        bio: 'Keep my bio', photoURL: 'custom.png',
        preferences: { theme: 'light', excludedGenres: [27] },
        watched: [{ id: 1 }], watchlist: [{ id: 2 }]
    });
    const authUser = { uid: 'alice', displayName: 'Google name', photoURL: 'google.png' };
    await runTransaction(alice, async transaction => {
        const snapshot = await transaction.get(ref);
        transaction.set(ref, getMissingProfileFields(snapshot.data(), authUser), { merge: true });
    });
    const stored = (await getDoc(ref)).data();
    assert.equal(stored.displayName, 'Edited name');
    assert.equal(stored.username, 'edited');
    assert.equal(stored.photoURL, 'custom.png');
    assert.equal(stored.bio, 'Keep my bio');
    assert.deepEqual(stored.watched, [{ id: 1 }]);
    assert.deepEqual(stored.watchlist, [{ id: 2 }]);
    assert.equal(stored.preferences.theme, 'light');
    assert.deepEqual(stored.preferences.excludedGenres, [27]);
    assert.deepEqual(stored.preferences.excludedCountries, []);
    assert.deepEqual(getMissingProfileFields(stored, authUser), {});
    const found = await getDocs(query(collection(bob, 'users'), where('username', '==', 'edited')));
    assert.equal(found.docs[0].id, 'alice');
});

test('followers: a follower can only write or remove their own identity', async () => {
    const ref = doc(alice, 'users/bob/followers/alice');
    await setDoc(ref, { uid: 'alice' });
    await updateDoc(ref, { displayName: 'Alice' });
    await denied(setDoc(doc(eve, 'users/bob/followers/alice'), { uid: 'alice' }));
    await denied(updateDoc(doc(bob, 'users/bob/followers/alice'), { displayName: 'forged' }));
    await denied(deleteDoc(doc(eve, 'users/bob/followers/alice')));
    await denied(updateDoc(ref, { uid: 'eve' }));
    await denied(setDoc(doc(alice, 'users/alice/followers/alice'), { uid: 'alice' }));
    await deleteDoc(ref);
});

test('following: only owner can write and the payload must match the target', async () => {
    const ref = doc(alice, 'users/alice/following/bob');
    await setDoc(ref, { uid: 'bob' });
    await denied(setDoc(doc(bob, 'users/alice/following/eve'), { uid: 'eve' }));
    await denied(updateDoc(ref, { uid: 'eve' }));
    await denied(deleteDoc(doc(eve, 'users/alice/following/bob')));
    await deleteDoc(ref);
});

test('follow/unfollow batches do not need to write the target profile', async () => {
    const batch = writeBatch(alice);
    batch.set(doc(alice, 'users/alice/following/bob'), { uid: 'bob' });
    batch.set(doc(alice, 'users/bob/followers/alice'), { uid: 'alice' });
    await batch.commit();
    const undo = writeBatch(alice);
    undo.delete(doc(alice, 'users/alice/following/bob'));
    undo.delete(doc(alice, 'users/bob/followers/alice'));
    await undo.commit();
    assert.equal((await getDoc(doc(alice, 'users/bob'))).data().displayName, 'Bob');
});

test('movies: authenticated reads and owner-only writes/deletes', async () => {
    const ref = doc(alice, 'users/alice/movies/film');
    await setDoc(ref, { title: 'Film' });
    await updateDoc(ref, { watched: true });
    await getDoc(doc(bob, 'users/alice/movies/film'));
    await denied(getDoc(doc(anonymous, 'users/alice/movies/film')));
    await denied(setDoc(doc(bob, 'users/alice/movies/another'), { title: 'Forged' }));
    await denied(updateDoc(doc(bob, 'users/alice/movies/film'), { watched: false }));
    await denied(deleteDoc(doc(bob, 'users/alice/movies/film')));
    await deleteDoc(ref);
});

test('lists: immutable ownership, constrained collaboration and owner-only deletion', async () => {
    const ref = doc(alice, 'lists/shared');
    await denied(setDoc(doc(bob, 'lists/forged'), { ownerId: 'alice' }));
    await setDoc(ref, { ownerId: 'alice', name: 'Shared', collaborators: ['bob', 'eve'], movies: [] });
    await updateDoc(ref, { name: 'Renamed' });
    await denied(updateDoc(ref, { ownerId: 'bob' }));
    const collabRef = doc(bob, 'lists/shared');
    await updateDoc(collabRef, { movies: [{ id: 10 }], updatedAt: serverTimestamp() });
    for (const updates of [
        { ownerId: 'bob' }, { name: 'Hijacked' }, { privacy: 'private' },
        { collaborators: ['bob'] }, { collaborators: ['bob', 'eve', 'intruder'] },
        { movies: [], injected: true }, { movies: 'invalid' }
    ]) await denied(updateDoc(collabRef, updates));
    await denied(deleteDoc(collabRef));
    await updateDoc(collabRef, { collaborators: arrayRemove('bob') });
    assert.deepEqual((await getDoc(ref)).data().collaborators, ['eve']);
    await denied(updateDoc(collabRef, { movies: [] }));
    await denied(deleteDoc(collabRef));
    await deleteDoc(ref);
});

test('lists without collaborators remain manageable by their owner', async () => {
    const ref = doc(alice, 'lists/old');
    await setDoc(ref, { ownerId: 'alice', name: 'Old' });
    await updateDoc(ref, { description: 'Updated' });
    await denied(updateDoc(doc(bob, 'lists/old'), { movies: [] }));
    await deleteDoc(ref);
});

test('friend requests: no impersonation or mutation; only participants read/delete', async () => {
    await denied(setDoc(doc(eve, 'friendRequests/spoof'), invitation('alice', 'bob')));
    await denied(setDoc(doc(alice, 'friendRequests/self'), invitation('alice', 'alice')));
    await denied(setDoc(doc(alice, 'friendRequests/preaccepted'), { ...invitation('alice', 'bob'), status: 'accepted' }));
    const ref = doc(alice, 'friendRequests/participant-test');
    await setDoc(ref, invitation('alice', 'bob'));
    await getDoc(doc(bob, 'friendRequests/participant-test'));
    await denied(getDoc(doc(eve, 'friendRequests/participant-test')));
    await denied(updateDoc(ref, { toUid: 'eve' }));
    await denied(deleteDoc(doc(eve, 'friendRequests/participant-test')));
    await deleteDoc(doc(bob, 'friendRequests/participant-test'));
    await setDoc(ref, invitation('alice', 'bob'));
    await deleteDoc(ref);
});

test('friendship discovery supports absent and random-ID requests with restricted reads', async () => {
    const sent = query(collection(alice, 'friendRequests'), where('fromUid', '==', 'alice'), where('toUid', '==', 'bob'));
    const received = query(collection(bob, 'friendRequests'), where('fromUid', '==', 'alice'), where('toUid', '==', 'bob'));
    assert.equal((await getDocs(sent)).empty, true);
    const ref = doc(alice, 'friendRequests/old-random-id');
    await setDoc(ref, invitation('alice', 'bob'));
    assert.equal((await getDocs(sent)).size, 1);
    assert.equal((await getDocs(received)).size, 1);
    await deleteDoc(ref);
});

function acceptance(db, requestId, removeRequest = true) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users/alice/friends/bob'), { uid: 'bob', requestId });
    batch.set(doc(db, 'users/bob/friends/alice'), { uid: 'alice', requestId });
    if (removeRequest) batch.delete(doc(db, 'friendRequests', requestId));
    return batch.commit();
}

test('friendship creation requires recipient consent and atomic request consumption', async () => {
    await denied(setDoc(doc(bob, 'users/alice/friends/bob'), { uid: 'bob' }));
    await denied(setDoc(doc(alice, 'users/alice/friends/eve'), { uid: 'eve' }));
    const requestId = 'acceptance';
    await setDoc(doc(alice, 'friendRequests', requestId), invitation('alice', 'bob'));
    await denied(acceptance(alice, requestId));
    await denied(acceptance(eve, requestId));
    await denied(acceptance(bob, requestId, false));
    await acceptance(bob, requestId);
    assert.equal((await getDoc(doc(alice, 'users/alice/friends/bob'))).data().uid, 'bob');
    assert.equal((await getDoc(doc(bob, 'users/bob/friends/alice'))).data().uid, 'alice');
    await denied(deleteDoc(doc(eve, 'users/alice/friends/bob')));
    await deleteDoc(doc(bob, 'users/alice/friends/bob'));
    await deleteDoc(doc(bob, 'users/bob/friends/alice'));
});

test('list requests must identify the real list owner; only participants can delete', async () => {
    await setDoc(doc(alice, 'lists/joinable'), { ownerId: 'alice', movies: [] });
    await denied(setDoc(doc(bob, 'listRequests/forged-recipient'), { ...invitation('bob', 'eve'), listId: 'joinable' }));
    await denied(setDoc(doc(eve, 'listRequests/spoof-sender'), { ...invitation('bob', 'alice'), listId: 'joinable' }));
    await setDoc(doc(bob, 'listRequests/join'), { ...invitation('bob', 'alice'), listId: 'joinable' });
    await getDoc(doc(alice, 'listRequests/join'));
    await denied(getDoc(doc(eve, 'listRequests/join')));
    await denied(updateDoc(doc(bob, 'listRequests/join'), { toUid: 'eve' }));
    await denied(deleteDoc(doc(eve, 'listRequests/join')));
    await deleteDoc(doc(alice, 'listRequests/join'));
    await deleteDoc(doc(alice, 'lists/joinable'));
});

test('chat documents, nested messages and legacy profiles are completely closed', async () => {
    for (const path of ['chats/alice_bob', 'chats/alice_bob/messages/one', 'messages/one', 'userProfiles/alice', 'userProfiles/alice/followers/bob']) {
        await denied(getDoc(doc(alice, path)));
        await denied(setDoc(doc(alice, path), { uid: 'alice', senderId: 'alice', participants: ['alice', 'bob'] }));
        await denied(deleteDoc(doc(alice, path)));
    }
    await denied(getDocs(collection(alice, 'chats')));
    await denied(getDocs(collection(alice, 'chats/alice_bob/messages')));
    await denied(getDocs(collection(alice, 'userProfiles')));
});
