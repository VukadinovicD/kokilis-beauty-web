import { Routes } from '@angular/router';
import {authGuard} from './core/guards/auth-guard';
import {SalonServices} from './pages/salon-services/salon-services';
import {Clients} from './pages/clients/clients';
import {Dashboard} from './pages/dashboard/dashboard';
import {AppLayout} from './layout/app-layout/app-layout';
import {Login} from './pages/login/login';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'clients', component: Clients },
      { path: 'services', component: SalonServices },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
