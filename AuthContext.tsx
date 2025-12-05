
import React from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from './types';

export const AuthContext = React.createContext<{ user: User | null, userProfile: UserProfile | null }>({ user: null, userProfile: null });
