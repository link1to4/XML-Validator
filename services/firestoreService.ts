import {
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    orderBy,
    query
} from 'firebase/firestore';
import { db } from './firebase';
import { DtdFile } from '../types';

// Firestore collection 名稱
const COLLECTION_NAME = 'dtd_files';

/**
 * 從 Firestore 取得所有 DTD 檔案
 */
export const fetchDtdFiles = async (): Promise<DtdFile[]> => {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);

        const files: DtdFile[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            files.push({
                name: data.name,
                content: data.content,
            });
        });

        return files;
    } catch (error) {
        console.error('Error fetching DTD files:', error);
        throw error;
    }
};

/**
 * 儲存 DTD 檔案至 Firestore
 * 使用檔案名稱作為文件 ID，若已存在則覆蓋
 */
export const saveDtdFile = async (file: DtdFile): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, file.name);
        await setDoc(docRef, {
            name: file.name,
            content: file.content,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error saving DTD file:', error);
        throw error;
    }
};

/**
 * 從 Firestore 刪除 DTD 檔案
 */
export const deleteDtdFile = async (name: string): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, name);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting DTD file:', error);
        throw error;
    }
};
