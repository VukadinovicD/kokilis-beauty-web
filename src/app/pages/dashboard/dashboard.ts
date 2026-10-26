import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import { AppointmentsService } from '../../core/services/appointments.service';
import { ClientsService } from '../../core/services/clients.service';
import { SalonServiceService } from '../../core/services/salon-service.service';
import { Appointment } from '../../core/models/appointment.model';
import { Client } from '../../core/models/client.model';
import { SalonService } from '../../core/models/salon-service.model';

interface CalendarDay {
  date: Date;
  currentMonth: boolean;
  isToday: boolean;
  // One entry per SLOT_TIMES, null while the slot is free.
  slots: (Appointment | null)[];
  // Appointments that did not fit into any slot, e.g. a fifth one that day.
  extra: Appointment[];
}

// The salon has four appointments a day, at these times; unfilled ones show as blank slots.
const SLOT_TIMES = ['09:00', '11:00', '14:00', '16:00'];

const MONTH_NAMES = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
];

const WEEK_DAYS = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];

// Hours and minutes offered when picking the start time, 24-hour clock.
const HOURS = Array.from({ length: 15 }, (_, i) => String(i + 7).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

@Component({
  selector: 'app-dashboard',
  imports: [NgIf, NgForOf, NgTemplateOutlet, FormsModule, ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private appointmentsService = inject(AppointmentsService);
  private clientsService = inject(ClientsService);
  private salonServiceService = inject(SalonServiceService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  monthNames = MONTH_NAMES;
  weekDays = WEEK_DAYS;
  slotTimes = SLOT_TIMES;

  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth();
  calendarDays: CalendarDay[] = [];

  appointments: Appointment[] = [];
  salonServices: SalonService[] = [];

  errorMessage = '';
  submitting = false;

  isModalOpen = false;
  isEditMode = false;
  selectedAppointmentId: number | null = null;
  selectedDate: Date | null = null;

  clientSearch = '';
  clientResults: Client[] = [];
  selectedClient: Client | null = null;
  private clientSearchTimeout: ReturnType<typeof setTimeout> | undefined;

  startHour = '';
  startMinute = '';

  form = this.fb.group({
    client_id: this.fb.control<number | null>(null, Validators.required),
    salon_service_id: this.fb.control<number | null>(null, Validators.required),
    start_time: ['', Validators.required],
  });

  get monthLabel(): string {
    return `${this.monthNames[this.viewMonth]} ${this.viewYear}`;
  }

  get selectedDateLabel(): string {
    if (!this.selectedDate) {
      return '';
    }

    const d = String(this.selectedDate.getDate()).padStart(2, '0');
    const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0');

    return `${d}.${m}.${this.selectedDate.getFullYear()}.`;
  }

  // An existing appointment may start outside the offered times; it stays selectable.
  get hourOptions(): string[] {
    return withValue(HOURS, this.startHour);
  }

  get minuteOptions(): string[] {
    return withValue(MINUTES, this.startMinute);
  }

  ngOnInit(): void {
    this.loadSalonServices();
    this.buildCalendar();
    this.loadAppointments();
  }

  previousMonth(): void {
    this.viewMonth--;

    if (this.viewMonth < 0) {
      this.viewMonth = 11;
      this.viewYear--;
    }

    this.buildCalendar();
    this.loadAppointments();
  }

  nextMonth(): void {
    this.viewMonth++;

    if (this.viewMonth > 11) {
      this.viewMonth = 0;
      this.viewYear++;
    }

    this.buildCalendar();
    this.loadAppointments();
  }

  goToToday(): void {
    const today = new Date();
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth();
    this.buildCalendar();
    this.loadAppointments();
  }

  buildCalendar(): void {
    const year = this.viewYear;
    const month = this.viewMonth;

    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const todayKey = this.dateKey(new Date());

    const days: CalendarDay[] = [];

    for (let i = startOffset; i > 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i + 1);
      days.push({ date, currentMonth: false, isToday: false, slots: [], extra: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({ date, currentMonth: true, isToday: this.dateKey(date) === todayKey, slots: [], extra: [] });
    }

    let nextMonthDay = 1;
    while (days.length < 42) {
      days.push({
        date: new Date(year, month + 1, nextMonthDay),
        currentMonth: false,
        isToday: false,
        slots: [],
        extra: [],
      });
      nextMonthDay++;
    }

    this.calendarDays = days;
    this.attachAppointments();
  }

  loadSalonServices(): void {
    this.salonServiceService.getAll().subscribe({
      next: (services) => {
        this.salonServices = services;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Neuspešno učitavanje usluga.';
        this.cdr.detectChanges();
      },
    });
  }

  loadAppointments(): void {
    this.errorMessage = '';
    const start = this.dateKey(this.calendarDays[0].date);
    const end = this.dateKey(this.calendarDays[this.calendarDays.length - 1].date);

    this.appointmentsService.getAll(start, end).subscribe({
      next: (appointments) => {
        this.appointments = appointments ?? [];
        this.attachAppointments();
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Neuspešno učitavanje termina.';
        this.cdr.detectChanges();
      },
    });
  }

  formatTime(value: string): string {
    const date = new Date(value.replace(' ', 'T'));
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  openCreateModal(date: Date, time = '', event?: Event): void {
    event?.stopPropagation();

    this.isModalOpen = true;
    this.isEditMode = false;
    this.selectedAppointmentId = null;
    this.selectedDate = date;
    this.selectedClient = null;
    this.clientSearch = '';
    this.clientResults = [];
    this.errorMessage = '';
    [this.startHour = '', this.startMinute = ''] = time ? time.split(':') : [];

    this.form.reset({
      client_id: null,
      salon_service_id: null,
      start_time: time,
    });
  }

  openEditModal(appointment: Appointment, event: Event): void {
    event.stopPropagation();

    this.isModalOpen = true;
    this.isEditMode = true;
    this.selectedAppointmentId = appointment.id;
    this.selectedDate = new Date(appointment.start_time.replace(' ', 'T'));
    this.selectedClient = appointment.client ?? null;
    this.clientSearch = '';
    this.clientResults = [];
    this.errorMessage = '';

    const startTime = this.formatTime(appointment.start_time);
    [this.startHour, this.startMinute] = startTime.split(':');

    this.form.setValue({
      client_id: appointment.client_id,
      salon_service_id: appointment.salon_service_id,
      start_time: startTime,
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.selectedAppointmentId = null;
    this.selectedDate = null;
    this.selectedClient = null;
    this.clientSearch = '';
    this.clientResults = [];
    this.submitting = false;
    this.errorMessage = '';
    this.form.reset();
  }

  searchClients(): void {
    clearTimeout(this.clientSearchTimeout);
    const term = this.clientSearch.trim();

    if (!term) {
      this.clientResults = [];
      return;
    }

    this.clientSearchTimeout = setTimeout(() => {
      this.clientsService.getClients(term, 1).subscribe({
        next: (response) => {
          this.clientResults = response.data ?? [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.clientResults = [];
        },
      });
    }, 300);
  }

  selectClient(client: Client): void {
    this.selectedClient = client;
    this.clientResults = [];
    this.clientSearch = '';
    this.form.patchValue({ client_id: client.id });
    this.form.controls.client_id.markAsTouched();
  }

  clearClient(): void {
    this.selectedClient = null;
    this.form.patchValue({ client_id: null });
  }

  selectHour(hour: string): void {
    this.startHour = hour;
    this.startMinute ||= '00';
    this.syncStartTime();
  }

  selectMinute(minute: string): void {
    this.startMinute = minute;
    this.syncStartTime();
  }

  // The time counts only once an hour is picked; a minute alone is kept until then.
  private syncStartTime(): void {
    this.form.patchValue({ start_time: this.startHour ? `${this.startHour}:${this.startMinute}` : '' });
    this.form.controls.start_time.markAsTouched();
  }

  submit(): void {
    if (this.form.invalid || !this.selectedDate) {
      this.form.markAllAsTouched();
      return;
    }

    const startTime = this.form.value.start_time ?? '';

    const dateStr = this.dateKey(this.selectedDate);

    const payload = {
      client_id: this.form.value.client_id!,
      salon_service_id: this.form.value.salon_service_id!,
      start_time: `${dateStr} ${startTime}:00`,
    };

    this.submitting = true;
    this.errorMessage = '';

    const request =
      this.isEditMode && this.selectedAppointmentId
        ? this.appointmentsService.update(this.selectedAppointmentId, payload)
        : this.appointmentsService.create(payload);

    request.subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.loadAppointments();
      },
      error: (error) => {
        this.submitting = false;
        this.errorMessage = this.extractErrorMessage(error);
        this.cdr.detectChanges();
      },
    });
  }

  deleteAppointment(): void {
    if (!this.selectedAppointmentId) {
      return;
    }

    const confirmed = window.confirm('Da li ste sigurni da želite da obrišete termin?');

    if (!confirmed) {
      return;
    }

    this.appointmentsService.delete(this.selectedAppointmentId).subscribe({
      next: () => {
        this.closeModal();
        this.loadAppointments();
      },
      error: () => {
        this.errorMessage = 'Neuspešno brisanje termina.';
        this.cdr.detectChanges();
      },
    });
  }

  private attachAppointments(): void {
    const map = new Map<string, Appointment[]>();

    for (const appointment of this.appointments) {
      const key = this.dateKey(new Date(appointment.start_time.replace(' ', 'T')));

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(appointment);
    }

    for (const day of this.calendarDays) {
      const key = this.dateKey(day.date);
      const appointments = (map.get(key) ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time));

      day.slots = SLOT_TIMES.map(() => null);
      day.extra = [];

      for (const appointment of appointments) {
        // The latest slot that starts no later than the appointment, so 10:30 lands in the 09:00 one.
        const time = this.formatTime(appointment.start_time);
        const preferred = Math.max(0, SLOT_TIMES.filter((slot) => slot <= time).length - 1);
        // Taken already: the next free slot, else the closest free one before it, else it goes below the slots.
        const free = day.slots.findIndex((slot, i) => !slot && i >= preferred);
        const index = free !== -1 ? free : day.slots.lastIndexOf(null);

        if (index === -1) {
          day.extra.push(appointment);
        } else {
          day.slots[index] = appointment;
        }
      }
    }
  }

  private dateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private extractErrorMessage(error: any): string {
    return error?.message || 'Došlo je do greške. Pokušajte ponovo.';
  }
}

function withValue(options: string[], value: string): string[] {
  return !value || options.includes(value) ? options : [...options, value].sort();
}