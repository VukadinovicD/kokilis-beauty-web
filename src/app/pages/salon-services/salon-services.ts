import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { SalonService } from '../../core/models/salon-service.model';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SalonServiceService } from '../../core/services/salon-service.service';
import { NgForOf, NgIf } from '@angular/common';

@Component({
  selector: 'app-salon-services',
  imports: [
    FormsModule,
    NgIf,
    NgForOf,
    ReactiveFormsModule
  ],
  templateUrl: './salon-services.html',
  styleUrl: './salon-services.scss',
})
export class SalonServices implements OnInit {
  services: SalonService[] = [];
  filteredServices: SalonService[] = [];

  search = '';
  errorMessage = '';
  submitting = false;

  isModalOpen = false;
  isEditMode = false;
  selectedServiceId: number | null = null;

  form: FormGroup;

  constructor(
    private salonServiceService: SalonServiceService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]]
    });
  }

  ngOnInit(): void {
    this.fetchServices();
  }

  fetchServices(): void {
    this.errorMessage = '';

    this.salonServiceService.getAll().subscribe({
      next: (response) => {
        this.services = response;
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Error to load services.';
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    const term = this.search.trim().toLowerCase();

    if (!term) {
      this.filteredServices = [...this.services];
      return;
    }

    this.filteredServices = this.services.filter(service =>
      service.name.toLowerCase().includes(term) ||
      service.slug.toLowerCase().includes(term)
    );
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.selectedServiceId = null;
    this.form.reset();
    this.errorMessage = '';
  }

  openEditModal(service: SalonService): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.selectedServiceId = service.id;
    this.errorMessage = '';

    this.form.patchValue({
      name: service.name
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.selectedServiceId = null;
    this.submitting = false;
    this.form.reset();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const payload = {
      name: this.form.value.name
    };

    if (this.isEditMode && this.selectedServiceId) {
      this.salonServiceService.update(this.selectedServiceId, payload).subscribe({
        next: () => {
          this.submitting = false;
          this.closeModal();
          this.fetchServices();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.submitting = false;
          this.errorMessage = this.extractErrorMessage(error);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.salonServiceService.create(payload).subscribe({
        next: () => {
          this.submitting = false;
          this.closeModal();
          this.fetchServices();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.submitting = false;
          this.errorMessage = this.extractErrorMessage(error);
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteService(service: SalonService): void {
    const confirmed = confirm(`Da li ste sigurni da želite da obrišete uslugu "${service.name}"?`);

    if (!confirmed) {
      return;
    }

    this.errorMessage = '';

    this.salonServiceService.delete(service.id).subscribe({
      next: () => {
        this.fetchServices();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error);
        this.cdr.detectChanges();
      }
    });
  }

  private extractErrorMessage(error: any): string {
    if (error?.error?.errors) {
      const validationErrors = Object.values(error.error.errors).flat();
      if (validationErrors.length > 0) {
        return String(validationErrors[0]);
      }
    }

    return error?.error?.message || 'Došlo je do greške. Pokušajte ponovo.';
  }
}
