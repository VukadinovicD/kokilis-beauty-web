import {ChangeDetectorRef, Component, inject} from '@angular/core';
import {ClientsService} from '../../core/services/clients.service';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Client} from '../../core/models/client.model';
import {NgForOf, NgIf} from '@angular/common';
import {finalize} from 'rxjs';

@Component({
  selector: 'app-clients',
  imports: [
    FormsModule,
    NgIf,
    ReactiveFormsModule,
    NgForOf
  ],
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
})
export class Clients {
  private clientsService = inject(ClientsService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  clients: Client[] = [];
  search = '';
  currentPage = 1;
  lastPage = 1;
  total = 0;

  submitting = false;
  errorMessage = '';

  isModalOpen = false;
  isEditMode = false;
  selectedClientId: number | null = null;

  form = this.fb.group({
    first_name: ['', [Validators.required, Validators.maxLength(255)]],
    last_name: ['', [Validators.required, Validators.maxLength(255)]],
    nickname: ['', [Validators.maxLength(255)]],
    phone_number: ['', [Validators.required, Validators.maxLength(30)]],
  });

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(page = 1): void {
    this.errorMessage = '';

    this.clientsService
      .getClients(this.search, page)
      .pipe(
        finalize(() => {
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.clients = [...(response.data ?? [])];
          this.currentPage = response.current_page ?? 1;
          this.lastPage = response.last_page ?? 1;
          this.total = response.total ?? 0;

          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(error);
          this.errorMessage = 'Failed to load clients.';
        }
      });
  }

  onSearch(): void {
    this.loadClients(1);
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.selectedClientId = null;
    this.form.reset({
      first_name: '',
      last_name: '',
      nickname: '',
      phone_number: '',
    });
  }

  openEditModal(client: Client): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.selectedClientId = client.id;

    this.form.patchValue({
      first_name: client.first_name,
      last_name: client.last_name,
      nickname: client.nickname ?? '',
      phone_number: client.phone_number,
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.submitting = false;
    this.form.reset();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      first_name: this.form.value.first_name ?? '',
      last_name: this.form.value.last_name ?? '',
      nickname: this.form.value.nickname ?? '',
      phone_number: this.form.value.phone_number ?? '',
    };

    this.submitting = true;

    if (this.isEditMode && this.selectedClientId) {
      this.clientsService.updateClient(this.selectedClientId, payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadClients(this.currentPage);
        },
        error: () => {
          this.submitting = false;
          this.errorMessage = 'Failed to update client.';
        }
      });
      return;
    }

    this.clientsService.createClient(payload).subscribe({
      next: () => {
        this.closeModal();
        this.loadClients(1);
      },
      error: () => {
        this.submitting = false;
        this.errorMessage = 'Failed to create client.';
      }
    });
  }

  deleteClient(client: Client): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${client.first_name} ${client.last_name}?`
    );

    if (!confirmed) {
      return;
    }

    this.clientsService.deleteClient(client.id).subscribe({
      next: () => {
        this.loadClients(this.currentPage);
      },
      error: () => {
        this.errorMessage = 'Failed to delete client.';
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage || page === this.currentPage) {
      return;
    }

    this.loadClients(page);
  }
}
