import { firestore } from '../firebase'; // Adjust the import based on your Firebase setup
import { User } from '../types'; // Assuming you have a User type defined in your types/index.ts

const usersCollection = firestore.collection('users');

export const getUserProfile = async (uid: string): Promise<User | null> => {
    const userDoc = await usersCollection.doc(uid).get();
    if (userDoc.exists) {
        return { uid, ...userDoc.data() } as User;
    }
    return null;
};

export const updateUserProfile = async (uid: string, profileData: Partial<User>): Promise<void> => {
    await usersCollection.doc(uid).update(profileData);
};

export const createUserProfile = async (uid: string, name: string, email: string): Promise<void> => {
    await usersCollection.doc(uid).set({
        nombre: name,
        email: email,
    });
};