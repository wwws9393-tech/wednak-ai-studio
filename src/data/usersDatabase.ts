import { UserProfile } from '../types';
import {
  fetchUserFromFirestore as realFetchUser,
  findUserByPhoneFromFirestore as realFindUser,
  saveUserToFirestore as realSaveUser,
} from '../lib/firebase';

export const GUEST_ANONYMOUS_USER: UserProfile = {
  id: '',
  name: 'زائر Wedنك (ضيف)',
  phone: '',
  email: 'guest@wednak.app',
  city: 'بغداد',
  accountType: 'زبون',
  isGuest: true,
};

export const fetchUserFromFirestore = realFetchUser;
export const findUserByPhoneFromFirestore = realFindUser;
export const saveUserToFirestore = realSaveUser;
