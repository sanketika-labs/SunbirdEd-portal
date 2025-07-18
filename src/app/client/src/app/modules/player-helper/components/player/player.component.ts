import { ConfigService, NavigationHelperService, UtilService } from '@sunbird/shared';
import { Component, AfterViewInit, ViewChild, Renderer2, ElementRef, Input, Output, EventEmitter,
OnChanges, HostListener, OnInit, ChangeDetectorRef } from '@angular/core';
import * as _ from 'lodash-es';
import { PlayerConfig } from '@sunbird/shared';
import { Router } from '@angular/router';
import { ToasterService, ResourceService, ContentUtilsServiceService } from '@sunbird/shared';
import { ProgressPlayerService } from '../../service/video-player/progress-player.service';
const OFFLINE_ARTIFACT_MIME_TYPES = ['application/epub'];
import { Subject } from 'rxjs';
import { DeviceDetectorService } from 'ngx-device-detector';
import { IInteractEventEdata } from '@sunbird/telemetry';
import { UserService, FormService } from '../../../core/services';
import { OnDestroy } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { ContentService } from '@sunbird/core';
import { PublicPlayerService } from '@sunbird/public';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  private observer: MutationObserver;
  @Input() playerConfig: PlayerConfig;
  @Output() assessmentEvents = new EventEmitter<any>();
  @Output() questionScoreSubmitEvents = new EventEmitter<any>();
  @Output() questionScoreReviewEvents = new EventEmitter<any>();
  @ViewChild('contentIframe') contentIframe: ElementRef;
  @Output() playerOnDestroyEvent = new EventEmitter<any>();
  @Output() sceneChangeEvent = new EventEmitter<any>();
  @Input() contentProgressEvents$: Subject<any>;
  playerLoaded = false;
  buildNumber: string;
  @Input() playerOption: any;
  contentRatingModal = false;
  showRatingModalAfterClose = false;
  previewCdnUrl: string;
  isCdnWorking: string;
  CONSTANT = {
    ACCESSEVENT: 'renderer:question:submitscore',
    ISLASTATTEMPT: 'renderer:selfassess:lastattempt',
    MAXATTEMPT: 'renderer:maxLimitExceeded',
    ACCESSREVIEWEVENT: 'renderer:question:reviewAssessment'
  };
  @Input() overlayImagePath: string;
  @Input() isSingleContent: boolean;
  @Input() telemetryObject: {};
  @Input() pageId: string;
  @Input() contentData;
  @Input() isContentDeleted: Subject<any>;
  @Output() closePlayerEvent = new EventEmitter<any>();
  @Output() ratingPopupClose = new EventEmitter<any>();
  @Output() selfAssessLastAttempt = new EventEmitter<any>();
  contentDeleted = false;
  isMobileOrTab: boolean;
  showPlayIcon = true;
  closeButtonInteractEdata: IInteractEventEdata;
  loadPlayerInteractEdata: IInteractEventEdata;
  playerOverlayImage: string;
  isFullScreenView = false;
  public unsubscribe = new Subject<void>();
  public showNewPlayer = false;
  mobileViewDisplay = 'block';
  playerType: string;
  isDesktopApp = false;
  showQumlPlayer = false;
  contentId: string;
  collectionId:string;

  /**
 * Dom element reference of contentRatingModal
 */
  @ViewChild('modal') modal;

  @HostListener('window:popstate', ['$event'])
  onPopState(event) {
    this.closeContentFullScreen();
  }

  constructor(public configService: ConfigService, public router: Router, private toasterService: ToasterService,
    public resourceService: ResourceService, public navigationHelperService: NavigationHelperService,
    private deviceDetectorService: DeviceDetectorService, private userService: UserService, public formService: FormService
    , public contentUtilsServiceService: ContentUtilsServiceService, private contentService: ContentService,
    private cdr: ChangeDetectorRef, public playerService: PublicPlayerService, private utilService: UtilService,
    private el: ElementRef, private renderer: Renderer2, private progressPlayerService :ProgressPlayerService) {
    this.buildNumber = (<HTMLInputElement>document.getElementById('buildNumber'))
      ? (<HTMLInputElement>document.getElementById('buildNumber')).value : '1.0';
    this.previewCdnUrl = (<HTMLInputElement>document.getElementById('previewCdnUrl'))
      ? (<HTMLInputElement>document.getElementById('previewCdnUrl')).value : undefined;
    this.isCdnWorking = (<HTMLInputElement>document.getElementById('cdnWorking'))
      ? (<HTMLInputElement>document.getElementById('cdnWorking')).value : 'no';
  }

  @HostListener('window:orientationchange', ['$event'])
  public handleOrientationChange() {
    const screenType = _.get(screen, 'orientation.type');
      if ( screenType === 'portrait-primary' || screenType === 'portrait-secondary' ) {
      this.closeFullscreen();
    }
  }

  static readonly BLOCKED_KEYS = ['ArrowRight', 'ArrowLeft', ' ', 'k', 'l', 'j'];

  @HostListener('window:keydown', ['$event'])
  blockKeys(event: KeyboardEvent) {
    if (this.playerType==="video-player" && PlayerComponent.BLOCKED_KEYS.includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      // console.log('Blocked key:', event.key);
    }
  }

  ngOnInit() {
    this.checkForQumlPlayer()
    // Initialize the resourceBundles if it doesn't exist
    if (this.playerConfig) {
      this.playerConfig.context = {
        ...this.playerConfig.context,
        resourceBundles: {}
      };
    }
    // set the resource bundles
    if (this.resourceService && this.resourceService.frmelmnts.lbl) {
      this.playerConfig.context.resourceBundles = this.resourceService.frmelmnts.lbl;
    }
    // If `sessionStorage` has UTM data; append the UTM data to context.cdata
    if (this.playerConfig && sessionStorage.getItem('UTM')) {
      let utmData;
      try {
        utmData = JSON.parse(sessionStorage.getItem('UTM'));
      } catch (error) {
        throw new Error('JSON Parse Error => UTM data');
      }
      if (utmData && _.get(this.playerConfig, 'context.cdata')) {
        this.playerConfig.context.cdata = _.union(this.playerConfig.context.cdata, utmData);
      }
      if (utmData && !_.get(this.playerConfig, 'context.cdata')) {
        this.playerConfig.context['cdata'] = [];
        this.playerConfig.context.cdata = _.union(this.playerConfig.context.cdata, utmData);
      }
    }
    this.isDesktopApp = this.utilService.isDesktopApp;
    // Check for loggedIn user; and append user data to context object
    // User data (`firstName` and `lastName`) is used to show at the end of quiz
    if (this.playerConfig) {
      this.addUserDataToContext();
    }
    this.isMobileOrTab = this.deviceDetectorService.isMobile() || this.deviceDetectorService.isTablet();
    if (this.isSingleContent === false) {
      this.showPlayIcon = false;
    }
    this.setTelemetryData();
    this.navigationHelperService.contentFullScreenEvent.
      pipe(takeUntil(this.unsubscribe)).subscribe(isFullScreen => {
        this.isFullScreenView = isFullScreen;
      const root: HTMLElement = document.getElementsByTagName( 'html' )[0];
        if (isFullScreen) {
          root.classList.add('PlayerMediaQueryClass');
          document.body.classList.add('o-y-hidden');
        } else {
          root.classList.remove('PlayerMediaQueryClass');
          document.body.classList.remove('o-y-hidden');
        }
        if (this.isDesktopApp) {
          const hideCM = isFullScreen ? true : false;
          this.navigationHelperService.handleContentManagerOnFullscreen(hideCM);
        }
        this.loadPlayer();
      });

    this.contentUtilsServiceService.contentShareEvent.pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (this.isMobileOrTab && data === 'close') {
        this.mobileViewDisplay = 'block';
      }
    });
  }

  /**
   * loadPlayer method will be called
   */
  ngAfterViewInit() {
    if (this.playerConfig) {
      this.loadPlayer();
      this.removeTabIndexToPreventPlayerKeyBoardEvent();
    }
  }

  ngOnChanges(changes) {
    this.contentRatingModal = false;
    this.showNewPlayer = false;
    this.cdr.detectChanges();
    if (this.playerConfig) {
      this.playerOverlayImage = this.overlayImagePath ? this.overlayImagePath : _.get(this.playerConfig, 'metadata.appIcon');
      this.loadPlayer();      
    }
  }
  loadCdnPlayer() {
    const iFrameSrc = this.configService.appConfig.PLAYER_CONFIG.cdnUrl + '&build_number=' + this.buildNumber;
    setTimeout(() => {
      const playerElement = this.contentIframe.nativeElement;
      playerElement.src = iFrameSrc;
      playerElement.onload = (event) => {
        try {
          this.adjustPlayerHeight();
          playerElement.contentWindow.initializePreview(this.playerConfig);
          if (this.playerLoaded) {
            playerElement.removeEventListener('renderer:telemetry:event', telemetryEvent => this.generateContentReadEvent(telemetryEvent));
            window.frames['contentPlayer'].removeEventListener('message', accessEvent => this.generateScoreSubmitEvent(accessEvent), false);
          }
          this.playerLoaded = true;
          playerElement.addEventListener('renderer:telemetry:event', telemetryEvent => this.generateContentReadEvent(telemetryEvent));
          window.frames['contentPlayer'].addEventListener('message', accessEvent => this.generateScoreSubmitEvent(accessEvent), false);
        } catch (err) {
          this.loadDefaultPlayer();
        }
      };
    }, 0);
  }
  loadDefaultPlayer(url = this.configService.appConfig.PLAYER_CONFIG.baseURL) {
    const iFrameSrc = url + '&build_number=' + this.buildNumber;
    if (this.playerConfig) {
      this.playerConfig.context = {
          ...this.playerConfig.context,
          resourceBundles: {},
          dir: ""
      };
  }
  // set the resource bundles
  if (this.resourceService?.frmelmnts?.lbl) {
      this.playerConfig.context.resourceBundles = this.resourceService.frmelmnts.lbl;
      this.playerConfig.context.dir = this.getDocumentDir() || 'rtl';
  } 
    this.playerConfig.context.version = this.buildNumber;
    setTimeout(() => {
      const playerElement = this.contentIframe.nativeElement;
      playerElement.src = iFrameSrc;
      playerElement.onload = (event) => {
        try {
          this.adjustPlayerHeight();
          playerElement.contentWindow.initializePreview(this.playerConfig);
          if (this.playerLoaded) {
            playerElement.removeEventListener('renderer:telemetry:event', telemetryEvent => this.generateContentReadEvent(telemetryEvent));
            window.frames['contentPlayer'].removeEventListener('message', accessEvent => this.generateScoreSubmitEvent(accessEvent), false);
          }
          this.playerLoaded = true;
          playerElement.addEventListener('renderer:telemetry:event', telemetryEvent => this.generateContentReadEvent(telemetryEvent));
          window.frames['contentPlayer'].addEventListener('message', accessEvent => this.generateScoreSubmitEvent(accessEvent), false);
        } catch (err) {
          const prevUrls = this.navigationHelperService.history;
          if (this.isCdnWorking.toLowerCase() === 'yes' && prevUrls[prevUrls.length - 2]) {
            history.back();
          }
        }
      };
    }, 0);
  }

  loadPlayer() {
    this.checkForQumlPlayer();
    this.playerType = null;
    const formReadInputParams = {
      formType: 'content',
      formAction: 'play',
      contentType: 'player'
    };
    this.formService.getFormConfig(formReadInputParams).subscribe(
      (data: any) => {
        let isNewPlayer = false;
        _.forEach(data, (value) => {
          if (_.includes(_.get(value, 'mimeType'), _.get(this.playerConfig, 'metadata.mimeType')) && _.get(value, 'version') === 2) {
            this.playerConfig.context.threshold = _.get(value, 'threshold');
            this.playerType = _.get(value, 'type');
            isNewPlayer = true;
          }
        });
        if (isNewPlayer) {
          this.playerLoaded = false;
          this.loadNewPlayer();
        } else {
          this.loadOldPlayer();
        }
      },
      (error) => {
        this.loadOldPlayer();
      }
    );
  }

  removeTabIndexToPreventPlayerKeyBoardEvent(){
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMac = navigator.platform.toUpperCase().includes('MAC');

    this.observer = new MutationObserver(() => {
      /** Remove playback rate button */
      const playbackRateBtn = this.el.nativeElement.querySelector(
        'button.vjs-playback-rate.vjs-menu-button[title="Playback Rate"]'
      );
      if (playbackRateBtn && playbackRateBtn.parentNode) {
        this.renderer.removeChild(playbackRateBtn.parentNode, playbackRateBtn);
      }

      /** Disable progress control and other unwanted elements */
      const unwantedElements = document.querySelectorAll(
        '.vjs-progress-holder, .vjs-progress-control, .vjs-slider, .vjs-menu-item'
      );

      unwantedElements.forEach((el: any) => {
        el.removeAttribute('tabindex');
        el.setAttribute('aria-disabled', 'true');
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.5';

        // iOS/Mac specific event blocking
        if (isIOS || isMac) {
          el.addEventListener('touchstart', (e: Event) => e.preventDefault(), { passive: false });
          el.addEventListener('click', (e: Event) => e.preventDefault());
        }
      });

      /** Handle custom forward/backward buttons inside player container */
      const forward = this.el.nativeElement.querySelector('.player-container .forward');
      const backward = this.el.nativeElement.querySelector('.player-container .back-ward');

      [forward, backward].forEach((btn: HTMLElement | null) => {
        if (btn) {
          btn.style.pointerEvents = 'none';
          btn.style.opacity = '0.4';
          btn.style.display = 'none';

          // iOS/Mac specific event blocking
          if (isIOS || isMac) {
            btn.addEventListener('touchstart', (e: Event) => e.preventDefault(), { passive: false });
            btn.addEventListener('click', (e: Event) => e.preventDefault());
          }
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  checkForQumlPlayer() {
    if (_.get(this.playerConfig, 'metadata.mimeType') === this.configService?.appConfig?.PLAYER_CONFIG?.MIME_TYPE?.questionset) {
      this.playerConfig.config.sideMenu.showDownload = false;
      if (!_.get(this.playerConfig, 'metadata.instructions')) {
        this.playerService.getQuestionSetRead(_.get(this.playerConfig, 'metadata.identifier')).subscribe((data: any) => {
          _.merge(this.playerConfig.metadata, this.playerService.getProperties(data?.result?.questionset, this.configService?.editorConfig?.QUESTIONSET_EDITOR?.additionalProperties));
          this.showQumlPlayer = true;
        }, (error) => {
          this.showQumlPlayer = true;
        });
      } else {
        this.showQumlPlayer = true;
      }
    }
  }

  loadOldPlayer() {
    this.showNewPlayer = false;
    if (this.isDesktopApp) {
      this.updateMetadataForDesktop();
      const downloadStatus = Boolean(_.get(this.playerConfig, 'metadata.desktopAppMetadata.isAvailable'));
      let playerUrl = this.configService.appConfig.PLAYER_CONFIG.localBaseUrl;
      if (!downloadStatus) {
        playerUrl = `${playerUrl}webview=true`;
      }
      this.loadDefaultPlayer(playerUrl);
      return;
    }
    if (this.isMobileOrTab) {
      this.rotatePlayer();
    }
    if (this.previewCdnUrl !== '' && (this.isCdnWorking).toLowerCase() === 'yes') {
      this.loadCdnPlayer();
      return;
    }

    this.loadDefaultPlayer();
  }

  loadNewPlayer() {
    const downloadStatus = Boolean(_.get(this.playerConfig, 'metadata.desktopAppMetadata.isAvailable'));
    const artifactUrl = _.get(this.playerConfig, 'metadata.artifactUrl');
    this.contentId = _.get(this.playerConfig, 'metadata.identifier');
    this.collectionId = _.get(this.playerConfig, 'context.objectRollup.l1');
    if (downloadStatus && artifactUrl && !_.startsWith(artifactUrl, 'http://')) {
      this.playerConfig.metadata.artifactUrl = `${location.origin}/${artifactUrl}`;
    }
    this.addUserDataToContext();
    if (this.isMobileOrTab) {
      if (_.get(this.playerConfig, 'metadata.mimeType') !== this.configService.appConfig.PLAYER_CONFIG.MIME_TYPE.questionset) {
        this.rotatePlayer();
      }
    }
    this.showNewPlayer = true;
    if (this.userService.loggedIn) {
      this.userService.userData$.subscribe((user: any) => {
        if (user && !user.err) {
          const userProfile = user.userProfile;
          const userId = userProfile.id;
          const varName = (userId + '_' + (this.collectionId ? this.collectionId : '') + '_' + (this.contentId ? this.contentId : '') + '_config');
          const playerConfig: any = JSON.parse(localStorage.getItem(varName)) || {};
          this.playerConfig['config'] = { ...this.playerConfig['config'], ...playerConfig };

          this.playerConfig['config']['sideMenu'] = {
            "showDownload": false,
            showExit: false,
            showShare: false,
          }
          this.playerConfig.config['playBackSpeeds'] = [1];
        }
      });
    } else {
      const varName = ('guest' + '_' + (this.collectionId ? this.collectionId : '') + '_' + (this.contentId ? this.contentId : '') + '_config');;
      const playerConfig: any = JSON.parse(localStorage.getItem(varName)) || {};
      this.playerConfig['config'] = { ...this.playerConfig['config'], ...playerConfig };
    }
  }

  // Update ArtifactUrl for old Player
  updateMetadataForDesktop() {
    const downloadStatus = Boolean(_.get(this.playerConfig, 'metadata.desktopAppMetadata.isAvailable'));
    if (downloadStatus) {
      this.playerConfig.data = '';
      if (_.get(this.playerConfig, 'metadata.artifactUrl')
        && _.includes(OFFLINE_ARTIFACT_MIME_TYPES, this.playerConfig.metadata.mimeType)) {
        const artifactFileName = this.playerConfig.metadata.artifactUrl.split('/');
        this.playerConfig.metadata.artifactUrl = artifactFileName[artifactFileName.length - 1];
      }
    }
  }

  /**
   * Adjust player height after load
   */
  adjustPlayerHeight() {
    const playerWidth = $('#contentPlayer').width();
    if (playerWidth) {
      let height = playerWidth * (9 / 16);
      if (_.get(screen, 'orientation.type') === 'landscape-primary' && this.isMobileOrTab) {
        height = window.innerHeight;
      }
      $('#contentPlayer').css('height', height + 'px');
    }
  }

  generateScoreSubmitEvent(event: any) {
    if (event.data.toLowerCase() === (this.CONSTANT.ACCESSEVENT).toLowerCase()) {
      this.questionScoreSubmitEvents.emit(event);
    }
    if (event.data.toLowerCase() === (this.CONSTANT.ISLASTATTEMPT).toLowerCase()) {
      this.selfAssessLastAttempt.emit(event);
    }
    if (event.data.toLowerCase() === (this.CONSTANT.MAXATTEMPT).toLowerCase()) {
      this.selfAssessLastAttempt.emit(event);
    }
    if (event.data.toLowerCase() === (this.CONSTANT.ACCESSREVIEWEVENT).toLowerCase()) {
      this.questionScoreReviewEvents.emit(event);
    }
  }

  generatelimitedAttemptEvent(event) {
    if (_.get(event, 'edata.isLastAttempt')) {
      this.selfAssessLastAttempt.emit(event);
    } else if (_.get(event, 'edata.maxLimitExceeded')) {
      this.selfAssessLastAttempt.emit(event);
    }
  }

  eventHandler(event) {
    if (event.eid === 'END') {
      const metaDataconfig = event.metaData;
      if (this.userService.loggedIn) {
        this.userService.userData$.subscribe((user: any) => {
          if (user && !user.err) {
            const userProfile = user.userProfile;
            const userId = userProfile.id;
            const varName = (userId + '_' + (this.collectionId ? this.collectionId : '') + '_' + (this.contentId ? this.contentId : '') + '_config');
            localStorage.setItem(varName, JSON.stringify(metaDataconfig));
          }
        });
      } else {
        const userId = 'guest';
        const varName = (userId + '_' + (this.collectionId ? this.collectionId : '') + '_' + (this.contentId ? this.contentId : '') + '_config');
        localStorage.setItem(varName, JSON.stringify(metaDataconfig));
      }
    }
    if (event.eid === 'exdata') {
      this.generatelimitedAttemptEvent(event);
      return;
    }
    if (_.get(event, 'edata.type') === 'SHARE') {
      this.contentUtilsServiceService.contentShareEvent.emit('open');
      this.mobileViewDisplay = 'none';
    }
    if (_.get(event, 'edata.type') === 'PRINT') {
      const windowFrame = window.document.querySelector('pdf-viewer iframe');
      if (windowFrame) {
        windowFrame['contentWindow'].print();
      }
      this.mobileViewDisplay = 'none';
    }
  }

  generateContentReadEvent(event: any, newPlayerEvent?) {
    let eventCopy = newPlayerEvent ? _.cloneDeep(event) : event;
    if (!eventCopy) {
      return;
    }
    if (newPlayerEvent) {
      eventCopy = { detail: {telemetryData: eventCopy}};
    }
    const eid = _.get(eventCopy, 'detail.telemetryData.eid');
    const contentId = _.get(eventCopy, 'detail.telemetryData.object.id');
    // this.contentId = contentId;
    if (eid && (eid === 'START' || eid === 'END') && contentId === _.get(this.playerConfig, 'metadata.identifier')) {
      this.showRatingPopup(eventCopy);
      if (this.contentProgressEvents$) {
        this.contentProgressEvents$.next(eventCopy);
      }
    } else if (eid && (eid === 'IMPRESSION')) {
      this.emitSceneChangeEvent();
    }
    if (eid && (eid === 'ASSESS') || eid === 'START' || eid === 'END') {
      this.assessmentEvents.emit(eventCopy);
    }

    if (_.get(this.playerConfig, 'metadata.mimeType') === this.configService.appConfig.PLAYER_CONFIG.MIME_TYPE.questionset && eid === 'END') {
      this.questionScoreSubmitEvents.emit(event);
    }
  }
  emitSceneChangeEvent(timer = 0) {
    setTimeout(() => {
      if (_.get(this, 'contentIframe.nativeElement')) {
        const stageId = this.contentIframe.nativeElement.contentWindow.EkstepRendererAPI.getCurrentStageId();
        const eventData = { stageId };
        this.sceneChangeEvent.emit(eventData);
      }
    }, timer); // waiting for player to load, then fetching stageId (if we dont wait stageId will be undefined)
  }

  showRatingPopup(event) {
    let contentProgress;
    const playerSummary: Array<any> = _.get(event, 'detail.telemetryData.edata.summary');
    if (playerSummary) {
      const contentMimeType = this.playerConfig.metadata.mimeType;
      contentProgress = this.progressPlayerService.getContentProgress(playerSummary, contentMimeType);
    }
    if (event.detail.telemetryData.eid === 'END' && contentProgress === 100) {
      this.contentRatingModal = !this.isFullScreenView;
      this.showRatingModalAfterClose = true;
      if (this.modal) {
        this.modal.showContentRatingModal = true;
      }
    }
  }

  /**
   * this method will handle play button click and turn the player into landscape
   */
  enablePlayer(mode: boolean) {
    this.showPlayIcon = mode;
    this.loadPlayer();
  }

  /** this method checks for the browser capability to be fullscreen via if-else ladder
   * if match found, it will turn the player along will be close button into fullscreen and then
   * rotate it to landscape mode
   */
  rotatePlayer() {
    setTimeout(() => {
      const playVideo: any = document.querySelector('#playerFullscreen');
      try {
        if (playVideo.requestFullscreen) {
          playVideo.requestFullscreen();
        } else if (playVideo.mozRequestFullScreen) { /* Firefox */
          playVideo.mozRequestFullScreen();
        } else if (playVideo.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
          playVideo.webkitRequestFullscreen();
        } else if (playVideo.msRequestFullscreen) { /* IE/Edge */
          playVideo.msRequestFullscreen();
        }
        screen.orientation.lock('landscape');
      } catch (error) {}
    });
  }

  /** when user clicks on close button
   * this method will let the player to exit from fullscreen mode and
   * 1. video thumbnail will be shown for single content
   * 2. content-details page will be shown ( for multi-result dial-code search flow)
   */
  closeFullscreen() {
    /** to exit the fullscreen mode */
    if (document['exitFullscreen']) {
      document['exitFullscreen']();
    } else if (document['mozCancelFullScreen']) { /* Firefox */
      document['mozCancelFullScreen']();
    } else if (document['webkitExitFullscreen']) { /* Chrome, Safari and Opera */
      document['webkitExitFullscreen']();
    } else if (document['msExitFullscreen']) { /* IE/Edge */
      document['msExitFullscreen']();
    }

    if (this.showRatingModalAfterClose) {
      this.contentRatingModal = true;
      if (this.modal) {
        this.modal.showContentRatingModal = true;
      }
    }
    /** to change the view of the content-details page */
    this.showPlayIcon = true;
    this.closePlayerEvent.emit();
  }

  setTelemetryData() {
    this.closeButtonInteractEdata = {
      id: 'player-close-button',
      type: 'click',
      pageid: this.pageId
    };

    this.loadPlayerInteractEdata = {
      id: 'play-button',
      type: 'click',
      pageid: this.pageId
    };
  }

  closeContentFullScreen() {
    this.navigationHelperService.emitFullScreenEvent(false);
    this.loadPlayer();
  }

  closeModal() {
    this.focusOnReplay();
    this.ratingPopupClose.emit({});
  }

  getDocumentDir() {
    return typeof document !== 'undefined' ? document.dir || 'rtl' : 'rtl';
  }
  
  focusOnReplay() {
    if (this.playerType === 'quml-player') {
      const replayButton: HTMLElement = document.querySelector('.replay-section');
      if (replayButton) {
        replayButton.focus();
      }
    }
  }

  public addUserDataToContext() {
    if (this.userService.loggedIn) {
      this.userService.userData$.subscribe((user: any) => {
        if (user && !user.err) {
          const userProfile = user.userProfile;
          this.playerConfig.context['userData'] = {
            firstName: userProfile.firstName ? userProfile.firstName : 'Guest',
            lastName: userProfile.lastName ? userProfile.lastName : ''
          };
        }
      });
    } else {
      this.playerConfig.context.userData = {
        firstName: this.userService?.guestUserProfile?.formatedName || 'Guest',
        lastName: ''
      };
    }
  }

  ngOnDestroy() {
    const playerElement = _.get(this.contentIframe, 'nativeElement');
    if (playerElement) {
      if (_.get(playerElement, 'contentWindow.telemetry_web.tList.length')) {
        const request = {
          url: this.configService.urlConFig.URLS.TELEMETRY.SYNC,
          data: {
            'id': 'api.sunbird.telemetry',
            'ver': '3.0',
            'events': playerElement.contentWindow.telemetry_web.tList.map(item => JSON.parse(item))
          }
        };
        this.contentService.post(request).subscribe();
      }
      playerElement.remove();
    }
    this.unsubscribe.next();
    this.unsubscribe.complete();

    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
