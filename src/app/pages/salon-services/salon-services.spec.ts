import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalonServices } from './salon-services';

describe('SalonServices', () => {
  let component: SalonServices;
  let fixture: ComponentFixture<SalonServices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalonServices],
    }).compileComponents();

    fixture = TestBed.createComponent(SalonServices);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
