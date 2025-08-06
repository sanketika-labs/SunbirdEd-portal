import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ResourceService, ToasterService } from '@sunbird/shared';

@Component({
  selector: 'app-quiz-editor',
  templateUrl: './quiz-editor.component.html',
  styleUrls: ['./quiz-editor.component.scss']
})
export class QuizEditorComponent implements OnInit, OnDestroy {
  @ViewChild('observableElementsModal') observableElementsModal: any;

  public editorWindow: Window | null = null;
  private subscriptions: Subscription = new Subscription();
  public resourceService: ResourceService;
  public showEditor: boolean = false;
  public isFullScreen: boolean = false;
  public isLoading: boolean = false;
  public showValidationErrors: boolean = false;
  public canSaveAsDraft: boolean = true;
  public quizName: string = '';

  // Form Controls
  public titleFormControl = new FormControl('', [Validators.required, Validators.maxLength(120), this.noLeadingTrailingSpaces]);
  public typeFormControl = new FormControl('', [Validators.required]);
  public attemptsFormControl = new FormControl('', [Validators.required, Validators.min(1)]);
  public numberOfQuestionsFormControl = new FormControl('', [Validators.required, Validators.min(1)]);
  public easyFormControl = new FormControl('0', [Validators.required, Validators.min(0)]);
  public mediumFormControl = new FormControl('0', [Validators.required, Validators.min(0)]);
  public hardFormControl = new FormControl('0', [Validators.required, Validators.min(0)]);

  // Observable Elements
  public selectedObservableElements: any[] = [];
  public showObservableElementsModal: boolean = false;
  public isModalOpening: boolean = false;

  // Observable Elements Modal Data
 public observableElementsOptions: any[] = [
  { identifier: 'dc_1_observableelement_e001', code: 'E001', name: 'Enjoy working with children: smiles, positive interactions, patience' },
  { identifier: 'dc_1_observableelement_e008', code: 'E008', name: 'Propose new ideas and adapt to changes' },
  { identifier: 'dc_1_observableelement_e009', code: 'E009', name: 'Act with integrity and respect in all interactions (children, parents, colleagues, partners).' },
  { identifier: 'dc_1_observableelement_e016', code: 'E016', name: 'Embody the values and vision of the FMPS in its practice' },
  // 100 More Records
  { identifier: 'dc_1_observableelement_e017', code: 'E017', name: 'Maintains a clean and organized work environment.' },
  { identifier: 'dc_1_observableelement_e018', code: 'E018', name: 'Communicates clearly and effectively with team members.' },
  { identifier: 'dc_1_observableelement_e019', code: 'E019', name: 'Demonstrates active listening skills in all meetings.' },
  { identifier: 'dc_1_observableelement_e020', code: 'E020', name: 'Shows initiative by taking on additional tasks without being asked.' },
  { identifier: 'dc_1_observableelement_e021', code: 'E021', name: 'Provides constructive feedback to peers.' },
  { identifier: 'dc_1_observableelement_e022', code: 'E022', name: 'Manages time effectively to meet deadlines.' },
  { identifier: 'dc_1_observableelement_e023', code: 'E023', name: 'Adapts well to new technologies and processes.' },
  { identifier: 'dc_1_observableelement_e024', code: 'E024', name: 'Resolves conflicts in a professional and calm manner.' },
  { identifier: 'dc_1_observableelement_e025', code: 'E025', name: 'Mentors junior colleagues with patience and expertise.' },
  { identifier: 'dc_1_observableelement_e026', code: 'E026', name: 'Contributes positively to team morale and culture.' },
  { identifier: 'dc_1_observableelement_e027', code: 'E027', name: 'Asks clarifying questions to ensure understanding.' },
  { identifier: 'dc_1_observableelement_e028', code: 'E028', name: 'Demonstrates a strong sense of accountability for their work.' },
  { identifier: 'dc_1_observableelement_e029', code: 'E029', name: 'Follows established safety protocols at all times.' },
  { identifier: 'dc_1_observableelement_e030', code: 'E030', name: 'Handles confidential information with discretion.' },
  { identifier: 'dc_1_observableelement_e031', code: 'E031', name: 'Shows empathy and understanding towards colleagues.' },
  { identifier: 'dc_1_observableelement_e032', code: 'E032', name: 'Takes ownership of mistakes and learns from them.' },
  { identifier: 'dc_1_observableelement_e033', code: 'E033', name: 'Arrives on time for meetings and appointments.' },
  { identifier: 'dc_1_observableelement_e034', code: 'E034', name: 'Shows a commitment to continuous learning and self-improvement.' },
  { identifier: 'dc_1_observableelement_e035', code: 'E035', name: 'Provides excellent customer service, going the extra mile.' },
  { identifier: 'dc_1_observableelement_e036', code: 'E036', name: 'Collaborates effectively on cross-functional teams.' },
  { identifier: 'dc_1_observableelement_e037', code: 'E037', name: 'Uses critical thinking to solve complex problems.' },
  { identifier: 'dc_1_observableelement_e038', code: 'E038', name: 'Sets realistic goals and works diligently to achieve them.' },
  { identifier: 'dc_1_observableelement_e039', code: 'E039', name: 'Remains calm and focused under pressure.' },
  { identifier: 'dc_1_observableelement_e040', code: 'E040', name: 'Gives and receives feedback graciously.' },
  { identifier: 'dc_1_observableelement_e041', code: 'E041', name: 'Demonstrates a positive and "can-do" attitude.' },
  { identifier: 'dc_1_observableelement_e042', code: 'E042', name: 'Proactively identifies potential problems and offers solutions.' },
  { identifier: 'dc_1_observableelement_e043', code: 'E043', name: 'Follows through on commitments and promises.' },
  { identifier: 'dc_1_observableelement_e044', code: 'E044', name: 'Respects and values diverse perspectives and backgrounds.' },
  { identifier: 'dc_1_observableelement_e045', code: 'E045', name: 'Maintains a professional demeanor in all situations.' },
  { identifier: 'dc_1_observableelement_e046', code: 'E046', name: 'Actively participates in team discussions and brainstorming sessions.' },
  { identifier: 'dc_1_observableelement_e047', code: 'E047', name: 'Consistently meets or exceeds performance expectations.' },
  { identifier: 'dc_1_observableelement_e048', code: 'E048', name: 'Accepts new challenges with enthusiasm.' },
  { identifier: 'dc_1_observableelement_e049', code: 'E049', name: 'Maintains a high level of accuracy in all tasks.' },
  { identifier: 'dc_1_observableelement_e050', code: 'E050', name: 'Assists colleagues when they are in need of help.' },
  { identifier: 'dc_1_observableelement_e051', code: 'E051', name: 'Identifies and acts on opportunities for process improvement.' },
  { identifier: 'dc_1_observableelement_e052', code: 'E052', name: 'Shows strong problem-solving and analytical skills.' },
  { identifier: 'dc_1_observableelement_e053', code: 'E053', name: 'Is a reliable and dependable team member.' },
  { identifier: 'dc_1_observableelement_e054', code: 'E054', name: 'Exhibits excellent organizational and planning abilities.' },
  { identifier: 'dc_1_observableelement_e055', code: 'E055', name: 'Demonstrates resilience in the face of setbacks.' },
  { identifier: 'dc_1_observableelement_e056', code: 'E056', name: 'Maintains a good sense of humor and lightens the mood.' },
  { identifier: 'dc_1_observableelement_e057', code: 'E057', name: 'Is punctual and respectful of others\' time.' },
  { identifier: 'dc_1_observableelement_e058', code: 'E058', name: 'Shows a curiosity to learn about different departments or roles.' },
  { identifier: 'dc_1_observableelement_e059', code: 'E059', name: 'Consistently produces high-quality work.' },
  { identifier: 'dc_1_observableelement_e060', code: 'E060', name: 'Makes thoughtful decisions based on available data.' },
  { identifier: 'dc_1_observableelement_e061', code: 'E061', name: 'Treats all individuals with fairness and equality.' },
  { identifier: 'dc_1_observableelement_e062', code: 'E062', name: 'Takes initiative to resolve customer complaints effectively.' },
  { identifier: 'dc_1_observableelement_e063', code: 'E063', name: 'Uses technology and tools efficiently to improve productivity.' },
  { identifier: 'dc_1_observableelement_e064', code: 'E064', name: 'Demonstrates strong leadership qualities when needed.' },
  { identifier: 'dc_1_observableelement_e065', code: 'E065', name: 'Presents information clearly and concisely to various audiences.' },
  { identifier: 'dc_1_observableelement_e066', code: 'E066', name: 'Manages multiple priorities without becoming overwhelmed.' },
  { identifier: 'dc_1_observableelement_e067', code: 'E067', name: 'Shows resourcefulness in finding solutions with limited resources.' },
  { identifier: 'dc_1_observableelement_e068', code: 'E068', name: 'Is receptive to new ideas and open to different approaches.' },
  { identifier: 'dc_1_observableelement_e069', code: 'E069', name: 'Displays high emotional intelligence in interactions.' },
  { identifier: 'dc_1_observableelement_e070', code: 'E070', name: 'Considers the impact of their actions on the entire team.' },
  { identifier: 'dc_1_observableelement_e071', code: 'E071', name: 'Demonstrates integrity in all business dealings.' },
  { identifier: 'dc_1_observableelement_e072', code: 'E072', name: 'Creates a welcoming and inclusive environment for everyone.' },
  { identifier: 'dc_1_observableelement_e073', code: 'E073', name: 'Prioritizes tasks based on project goals and deadlines.' },
  { identifier: 'dc_1_observableelement_e074', code: 'E074', name: 'Offers assistance and guidance to new hires.' },
  { identifier: 'dc_1_observableelement_e075', code: 'E075', name: 'Shows a genuine passion for their work.' },
  { identifier: 'dc_1_observableelement_e076', code: 'E076', name: 'Stays informed about industry trends and best practices.' },
  { identifier: 'dc_1_observableelement_e077', code: 'E077', name: 'Maintains a positive attitude even in difficult situations.' },
  { identifier: 'dc_1_observableelement_e078', code: 'E078', name: 'Collaborates with external partners to achieve shared goals.' },
  { identifier: 'dc_1_observableelement_e079', code: 'E079', name: 'Identifies and mitigates potential risks to a project.' },
  { identifier: 'dc_1_observableelement_e080', code: 'E080', name: 'Communicates project status and updates effectively.' },
  { identifier: 'dc_1_observableelement_e081', code: 'E081', name: 'Encourages and celebrates the successes of others.' },
  { identifier: 'dc_1_observableelement_e082', code: 'E082', name: 'Demonstrates a deep understanding of company policies.' },
  { identifier: 'dc_1_observableelement_e083', code: 'E083', name: 'Takes an active role in professional development opportunities.' },
  { identifier: 'dc_1_observableelement_e084', code: 'E084', name: 'Provides clear and concise instructions to subordinates.' },
  { identifier: 'dc_1_observableelement_e085', code: 'E085', name: 'Is a source of creative and innovative ideas.' },
  { identifier: 'dc_1_observableelement_e086', code: 'E086', name: 'Builds strong, collaborative relationships with all stakeholders.' },
  { identifier: 'dc_1_observableelement_e087', code: 'E087', name: 'Uses data and metrics to inform decision-making.' },
  { identifier: 'dc_1_observableelement_e088', code: 'E088', name: 'Effectively handles ambiguity and changing requirements.' },
  { identifier: 'dc_1_observableelement_e089', code: 'E089', name: 'Maintains a high level of professionalism in all written communications.' },
  { identifier: 'dc_1_observableelement_e090', code: 'E090', name: 'Demonstrates a sense of ownership over their work and its outcomes.' },
  { identifier: 'dc_1_observableelement_e091', code: 'E091', name: 'Takes responsibility for their own mistakes.' },
  { identifier: 'dc_1_observableelement_e092', code: 'E092', name: 'Consistently provides timely and helpful responses to inquiries.' },
  { identifier: 'dc_1_observableelement_e093', code: 'E093', name: 'Shows flexibility in scheduling to accommodate team needs.' },
  { identifier: 'dc_1_observableelement_e094', code: 'E094', name: 'Actively participates in company-wide events and initiatives.' },
  { identifier: 'dc_1_observableelement_e095', code: 'E095', name: 'Uses sound judgment when making independent decisions.' },
  { identifier: 'dc_1_observableelement_e096', code: 'E096', name: 'Is a strong advocate for the team and its needs.' },
  { identifier: 'dc_1_observableelement_e097', code: 'E097', name: 'Demonstrates a commitment to meeting client expectations.' },
  { identifier: 'dc_1_observableelement_e098', code: 'E098', name: 'Provides detailed and accurate reports on progress.' },
  { identifier: 'dc_1_observableelement_e099', code: 'E099', name: 'Seeks opportunities to mentor and develop others.' },
  { identifier: 'dc_1_observableelement_e100', code: 'E100', name: 'Handles difficult conversations with tact and professionalism.' },
  { identifier: 'dc_1_observableelement_e101', code: 'E101', name: 'Is receptive to new ideas and provides thoughtful feedback.' },
  { identifier: 'dc_1_observableelement_e102', code: 'E102', name: 'Demonstrates a high level of self-awareness and emotional control.' },
  { identifier: 'dc_1_observableelement_e103', code: 'E103', name: 'Actively seeks to understand and resolve disagreements.' },
  { identifier: 'dc_1_observableelement_e104', code: 'E104', name: 'Encourages a culture of open communication within the team.' },
  { identifier: 'dc_1_observableelement_e105', code: 'E105', name: 'Uses time and resources efficiently to maximize output.' },
  { identifier: 'dc_1_observableelement_e106', code: 'E106', name: 'Demonstrates a strong sense of purpose and mission.' },
  { identifier: 'dc_1_observableelement_e107', code: 'E107', name: 'Is an effective and inspiring public speaker.' },
  { identifier: 'dc_1_observableelement_e108', code: 'E108', name: 'Builds consensus among team members on key decisions.' },
  { identifier: 'dc_1_observableelement_e109', code: 'E109', name: 'Takes proactive steps to address potential risks.' },
  { identifier: 'dc_1_observableelement_e110', code: 'E110', name: 'Maintains a positive outlook and uplifts the spirits of others.' },
  { identifier: 'dc_1_observableelement_e111', code: 'E111', name: 'Is an exemplary role model for junior staff members.' },
  { identifier: 'dc_1_observableelement_e112', code: 'E112', name: 'Shows a commitment to the company\'s long-term goals.' },
  { identifier: 'dc_1_observableelement_e113', code: 'E113', name: 'Provides thorough and well-documented work.' },
  { identifier: 'dc_1_observableelement_e114', code: 'E114', name: 'Is a key contributor to the team\'s overall success.' },
  { identifier: 'dc_1_observableelement_e115', code: 'E115', name: 'Manages project budgets with care and attention to detail.' },
  { identifier: 'dc_1_observableelement_e116', code: 'E116', name: 'Displays creativity in their approach to problem-solving.' },
  { identifier: 'dc_1_observableelement_e117', code: 'E117', name: 'Builds trust and rapport with new team members quickly.' },
  { identifier: 'dc_1_observableelement_e118', code: 'E118', name: 'Is a calming influence during stressful periods.' },
  { identifier: 'dc_1_observableelement_e119', code: 'E119', name: 'Consistently provides high-quality work on time.' },
  { identifier: 'dc_1_observableelement_e120', code: 'E120', name: 'Takes a proactive approach to managing their workload.' },
  { identifier: 'dc_1_observableelement_e121', code: 'E121', name: 'Demonstrates a strong work ethic and dedication.' },
  { identifier: 'dc_1_observableelement_e122', code: 'E122', name: 'Is a reliable point of contact for external partners.' },
  { identifier: 'dc_1_observableelement_e123', code: 'E123', name: 'Maintains a positive outlook even when facing challenges.' },
  { identifier: 'dc_1_observableelement_e124', code: 'E124', name: 'Displays a high level of integrity and ethical behavior.' },
  { identifier: 'dc_1_observableelement_e125', code: 'E125', name: 'Shows excellent attention to detail in all tasks.' },
  { identifier: 'dc_1_observableelement_e126', code: 'E126', name: 'Collaborates effectively with stakeholders to define requirements.' },
];
  public selectedMulti: any[] = [];

  public quizData: any = {
    title: '',
    description: '',
    questions: []
  };

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    resourceService: ResourceService,
    private toasterService: ToasterService,
    private cdr: ChangeDetectorRef
  ) {
    this.resourceService = resourceService;
  }

  /**
   * Custom validator for title - no leading/trailing spaces
   */
  private noLeadingTrailingSpaces(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const value = control.value.toString();
    if (value.startsWith(' ') || value.endsWith(' ')) {
      return { leadingTrailingSpaces: true };
    }
    return null;
  }

  /**
   * Custom validator for question distribution
   */
  private questionDistributionValidator = (control: AbstractControl): ValidationErrors | null => {
    // Skip validation if control is empty or not a valid number
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }

    // Skip validation if any of the form controls are not yet initialized
    if (!this.numberOfQuestionsFormControl || !this.easyFormControl || !this.mediumFormControl || !this.hardFormControl) {
      return null;
    }

    const totalQuestions = parseInt(this.numberOfQuestionsFormControl.value) || 0;
    const easy = parseInt(this.easyFormControl.value) || 0;
    const medium = parseInt(this.mediumFormControl.value) || 0;
    const hard = parseInt(this.hardFormControl.value) || 0;
    
    const currentTotal = easy + medium + hard;
    
    // Only validate distribution if totalQuestions > 0 and form has been interacted with
    if (totalQuestions > 0 && currentTotal !== totalQuestions && this.showValidationErrors) {
      return { distributionMismatch: true };
    }
    
    return null;
  };

  /**
   * Setup question distribution validation
   */
  private setupQuestionDistribution(): void {
    // Subscribe to numberOfQuestions changes to trigger validation on all difficulty fields
    this.numberOfQuestionsFormControl.valueChanges.subscribe(() => {
      if (this.showValidationErrors) {
        this.easyFormControl.updateValueAndValidity();
        this.mediumFormControl.updateValueAndValidity();
        this.hardFormControl.updateValueAndValidity();
      }
    });

    // Subscribe to difficulty field changes to validate distribution
    this.easyFormControl.valueChanges.subscribe(() => {
      if (this.showValidationErrors) {
        this.mediumFormControl.updateValueAndValidity();
        this.hardFormControl.updateValueAndValidity();
      }
    });
    
    this.mediumFormControl.valueChanges.subscribe(() => {
      if (this.showValidationErrors) {
        this.easyFormControl.updateValueAndValidity();
        this.hardFormControl.updateValueAndValidity();
      }
    });
    
    this.hardFormControl.valueChanges.subscribe(() => {
      if (this.showValidationErrors) {
        this.easyFormControl.updateValueAndValidity();
        this.mediumFormControl.updateValueAndValidity();
      }
    });
  }

  /**
   * Validate question distribution - returns true if valid, false if invalid
   */
  private validateQuestionDistribution(): boolean {
    const totalQuestions = parseInt(this.numberOfQuestionsFormControl.value) || 0;
    const easy = parseInt(this.easyFormControl.value) || 0;
    const medium = parseInt(this.mediumFormControl.value) || 0;
    const hard = parseInt(this.hardFormControl.value) || 0;
    
    const currentTotal = easy + medium + hard;
    
    // Return true if distribution is valid (sums equal total questions)
    return currentTotal === totalQuestions && totalQuestions > 0;
  }

  ngOnInit(): void {
    // Check if we're in full-screen mode
    this.isFullScreen = this.router.url.includes('edit/new-quiz');

    // Initialize the quiz editor
    this.initializeQuizEditor();

    // Subscribe to title changes to update header
    this.titleFormControl.valueChanges.subscribe((value) => {
      this.quizName = value || 'New Quiz';
    });

    // Setup question distribution logic
    this.setupQuestionDistribution();

    // Add custom validator to difficulty form controls after initialization
    this.easyFormControl.setValidators([Validators.required, Validators.min(0), this.questionDistributionValidator]);
    this.mediumFormControl.setValidators([Validators.required, Validators.min(0), this.questionDistributionValidator]);
    this.hardFormControl.setValidators([Validators.required, Validators.min(0), this.questionDistributionValidator]);
    
    // Update validity after adding validators
    this.easyFormControl.updateValueAndValidity();
    this.mediumFormControl.updateValueAndValidity();
    this.hardFormControl.updateValueAndValidity();

    // Initialize observable elements selection
    this.selectedMulti = [];
    this.isModalOpening = false;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    
    // Ensure body scrolling is restored when component is destroyed
    document.body.style.overflow = '';
  }

  private initializeQuizEditor(): void {
    // Initialize the quiz editor
    this.showEditor = true;
    this.quizData = {
      title: '',
      description: '',
      questions: []
    };
  }

  /**
   * Go back to workspace
   */
  goBack(): void {
    if (this.isFullScreen) {
      this.router.navigate(['/workspace/content/create']);
    } else {
      this.router.navigate(['/workspace/content/create']);
    }
  }

  /**
   * Navigate back (same as goBack for consistency)
   */
  navigateBack(): void {
    this.goBack();
  }

  /**
   * Preview quiz functionality
   */
  previewQuiz(): void {
    if (this.validateForm()) {
      // Implement preview logic
      this.toasterService.info(
        this.resourceService?.frmelmnts?.msg?.previewComingSoon || 'Preview functionality coming soon!'
      );
    }
  }

  /**
   * Save as draft functionality
   */
  saveDraft(): void {
    if (this.validateForm()) {
      this.isLoading = true;

      // Simulate API call
      setTimeout(() => {
        this.isLoading = false;
        this.toasterService.success(
          this.resourceService?.frmelmnts?.smsg?.quizSavedAsDraft || 'Quiz saved as draft successfully!'
        );
      }, 1000);
    }
  }

  /**
   * Publish quiz functionality
   */
  publishQuiz(): void {
    if (this.validateForm()) {
      this.isLoading = true;

      // Simulate API call
      setTimeout(() => {
        this.isLoading = false;
        this.toasterService.success(
          this.resourceService?.frmelmnts?.smsg?.quizPublished || 'Quiz published successfully!'
        );
        this.goBack();
      }, 1000);
    }
  }

  /**
   * Validate all form controls
   */
  private validateForm(): boolean {
    // Check observable elements validation first (before triggering form validation)
    const hasObservableElements = this.selectedObservableElements.length > 0;

    if (!hasObservableElements) {
      this.toasterService.error(
        this.resourceService?.frmelmnts?.emsg?.observableElementsRequired || 'Please select at least one observable element.'
      );
      return false;
    }

    // Now trigger form validation
    this.showValidationErrors = true;

    // Mark all form controls as touched to show validation errors
    this.titleFormControl.markAsTouched();
    this.typeFormControl.markAsTouched();
    this.attemptsFormControl.markAsTouched();
    this.numberOfQuestionsFormControl.markAsTouched();
    this.easyFormControl.markAsTouched();
    this.mediumFormControl.markAsTouched();
    this.hardFormControl.markAsTouched();

    // Trigger validation update for distribution validator
    this.easyFormControl.updateValueAndValidity();
    this.mediumFormControl.updateValueAndValidity();
    this.hardFormControl.updateValueAndValidity();

    // Check if all required fields are valid
    const isValid = this.titleFormControl.valid &&
      this.typeFormControl.valid &&
      this.attemptsFormControl.valid &&
      this.numberOfQuestionsFormControl.valid &&
      this.easyFormControl.valid &&
      this.mediumFormControl.valid &&
      this.hardFormControl.valid;

    if (!isValid) {
      // Check if it's a distribution error specifically
      const hasDistributionError = this.easyFormControl.hasError('distributionMismatch') ||
                                  this.mediumFormControl.hasError('distributionMismatch') ||
                                  this.hardFormControl.hasError('distributionMismatch');

      if (hasDistributionError) {
        this.toasterService.error(
          this.resourceService?.frmelmnts?.emsg?.questionDistributionError || 'The sum of Easy, Medium, and Hard questions must equal the total number of questions.'
        );
      } else {
        this.toasterService.error(
          this.resourceService?.frmelmnts?.emsg?.fillRequiredFields || 'Please fill all required fields correctly.'
        );
      }
      return false;
    }

    return true;
  }

  /**
   * Helper methods for template
   */
  getCurrentQuestionTotal(): number {
    const easy = parseInt(this.easyFormControl.value) || 0;
    const medium = parseInt(this.mediumFormControl.value) || 0;
    const hard = parseInt(this.hardFormControl.value) || 0;
    return easy + medium + hard;
  }

  getTotalQuestions(): number {
    return parseInt(this.numberOfQuestionsFormControl.value) || 0;
  }

  /**
   * Open Observable Elements Modal
   */
  openObservableElementsModal(): void {
    // Prevent multiple rapid clicks
    if (this.isModalOpening || this.showObservableElementsModal) {
      return;
    }

    this.isModalOpening = true;

    // Initialize selected items from current selection
    this.selectedMulti = [...this.selectedObservableElements];

    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';

    // Open modal immediately without timeout
    this.showObservableElementsModal = true;
    
    // Force change detection to ensure modal opens properly
    this.cdr.detectChanges();

    // Reset the opening flag
    this.isModalOpening = false;
  }

  /**
   * Close Observable Elements Modal
   */
  closeObservableElementsModal() {
    this.showObservableElementsModal = false;
    this.isModalOpening = false;
    
    // Restore body scrolling when modal is closed
    document.body.style.overflow = '';
    
    // Reset temporary selection immediately
    this.selectedMulti = [];
    
    // Force change detection to ensure modal closes properly
    this.cdr.detectChanges();
  }
  /**
   * Save selected observable elements
   */
  saveSelectedObservableElements(modal: any): void {
    // Check if no elements are selected
    if (this.selectedMulti.length === 0) {
      this.toasterService.error(
        this.resourceService?.frmelmnts?.emsg?.noObservableElementsSelected || 'No observable elements selected, please select'
      );
      return;
    }

    // Save the data
    this.selectedObservableElements = [...this.selectedMulti];
    this.selectedMulti = [];

    // Close the modal by setting the flag to false
    this.showObservableElementsModal = false;
    this.isModalOpening = false;

    // Restore body scrolling when modal is closed
    document.body.style.overflow = '';

    // Force change detection to ensure modal closes properly
    this.cdr.detectChanges();

    // Show success message
    this.toasterService.success(
      `${this.selectedObservableElements.length} ${this.resourceService?.frmelmnts?.msg?.elementsSelected || 'elements selected successfully!'}`
    );
  }

  /**
   * Remove observable element from selection
   */
  removeObservableElement(element: any): void {
    this.selectedObservableElements = this.selectedObservableElements.filter(selected => selected.identifier !== element.identifier);
  }

  /**
   * Save quiz functionality (legacy method for compatibility)
   */
  saveQuiz(): void {
    this.publishQuiz();
  }
}
