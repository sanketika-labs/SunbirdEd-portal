import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { QuizEditorComponent } from './quiz-editor.component';

describe('QuizEditorComponent', () => {
  let component: QuizEditorComponent;
  let fixture: ComponentFixture<QuizEditorComponent>;
  let mockRouter: Partial<Router>;
  let mockActivatedRoute: Partial<ActivatedRoute>;

  beforeEach(async () => {
    mockRouter = {
      navigate: jest.fn()
    };

    mockActivatedRoute = {
      // Add any required ActivatedRoute properties here
    };

    await TestBed.configureTestingModule({
      declarations: [ QuizEditorComponent ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate back when navigateBack is called', () => {
    component.navigateBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockActivatedRoute });
  });

  it('should clean up subscriptions on destroy', () => {
    const unsubscribeSpy = jest.spyOn(component['subscriptions'], 'unsubscribe');
    component.ngOnDestroy();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
