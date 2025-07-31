import { combineLatest as observableCombineLatest } from 'rxjs';
import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkSpace } from '../../classes/workspace';
import { SearchService, UserService, ISort, FrameworkService } from '@sunbird/core';
import { PermissionService } from '@sunbird/core';
import {
  ServerResponse, PaginationService, ConfigService, ToasterService, IPagination,
  ResourceService, ILoaderMessage, INoResultMessage, IContents, NavigationHelperService
} from '@sunbird/shared';
import { WorkSpaceService } from '../../services';
import * as _ from 'lodash-es';
import { IImpressionEventInput } from '@sunbird/telemetry';
import { debounceTime, map } from 'rxjs/operators';
import { SuiModalService, TemplateModalConfig, ModalTemplate } from 'ng2-semantic-ui-v9';

interface ICompetencyFrameworkContent extends IContents {
  status?: string;
  lastUpdatedOn?: string;
  code?: string;
  objectType?: string;
  type?: string;
  metaData?: {
    identifier?: string;
    name?: string;
    code?: string;
    status?: string;
    lastUpdatedOn?: string;
    description?: string;
    type?: string;
    objectType?: string;
    mimeType?: string;
  };
}

@Component({
  selector: 'app-competency-framework',
  templateUrl: './competency-framework.component.html',
  styleUrls: ['./competency-framework.component.scss']
})
export class CompetencyFrameworkComponent extends WorkSpace implements OnInit, AfterViewInit {
  @ViewChild('modalTemplate')
  public modalTemplate: ModalTemplate<{ data: string }, string, string>;
  state: string;
  route: Router;
  private activatedRoute: ActivatedRoute;
  contentIds: string;
  competencyFrameworkContent: Array<ICompetencyFrameworkContent> = [];
  showLoader = true;
  loaderMessage: ILoaderMessage;
  noResult = false;
  showError = false;
  noResultMessage: INoResultMessage;
  private paginationService: PaginationService;
  public config: ConfigService;
  pageLimit: number;
  pageNumber = 1;
  totalCount: Number;
  status: string;
  queryParams: any;
  public redirectUrl: string;
  public filterType: string;
  public sortingOptions: Array<ISort>;
  sortByOption: string;
  sort: { [key: string]: string };
  inviewLogs = [];
  query: string;
  pager: IPagination;
  private toasterService: ToasterService;
  telemetryImpression: IImpressionEventInput;
  public resourceService: ResourceService;
  private currentContentId: string;
  private contentMimeType: string;
  public isCompetencyFrameworkCreator: boolean = false;
  public isCompetencyFrameworkReviewer: boolean = false;

  constructor(public searchService: SearchService,
    public navigationhelperService: NavigationHelperService,
    public workSpaceService: WorkSpaceService,
    public frameworkService: FrameworkService,
    public permissionService: PermissionService,
    paginationService: PaginationService,
    activatedRoute: ActivatedRoute,
    route: Router, userService: UserService,
    toasterService: ToasterService, resourceService: ResourceService,
    config: ConfigService, public modalService: SuiModalService) {
    super(searchService, workSpaceService, userService);
    this.paginationService = paginationService;
    this.route = route;
    this.activatedRoute = activatedRoute;
    this.toasterService = toasterService;
    this.resourceService = resourceService;
    this.config = config;
    this.state = 'competencyframework';
    this.loaderMessage = {
      'loaderMessage': this.resourceService.messages.stmsg.m0110,
    };
    this.sortingOptions = this.config.dropDownConfig.FILTER.RESOURCES.sortingOptions;
    this.isCompetencyFrameworkCreator = this.permissionService.checkRolesPermissions(['CONTENT_CREATOR']);
    this.isCompetencyFrameworkReviewer = this.permissionService.checkRolesPermissions(['CONTENT_REVIEWER']);
  }

  ngOnInit() {
    const currentUrl = this.route.url;
    const isReviewerRoute = currentUrl.includes('competencyframework-reviewer');
    if (isReviewerRoute) {
      this.isCompetencyFrameworkReviewer = true;
      this.isCompetencyFrameworkCreator = false;
    }
    this.filterType = this.config.appConfig.competencyframework?.filterType || this.config.appConfig.allmycontent.filterType;
    this.redirectUrl = this.config.appConfig.competencyframework?.inPageredirectUrl || this.config.appConfig.allmycontent.inPageredirectUrl;
    observableCombineLatest(
      this.activatedRoute.params,
      this.activatedRoute.queryParams).pipe(
        debounceTime(10),
        map(([params, queryParams]) => ({ params, queryParams })
      ))
      .subscribe(bothParams => {
        if (bothParams.params.pageNumber) {
          this.pageNumber = Number(bothParams.params.pageNumber);
        }
        this.queryParams = bothParams.queryParams;
        this.query = this.queryParams['query'];
        this.fetchCompetencyFrameworkContent(this.config.appConfig.WORKSPACE.PAGE_LIMIT, this.pageNumber, bothParams);
      });
  }

  fetchCompetencyFrameworkContent(limit: number, pageNumber: number, bothParams) {
    this.showLoader = true;
    this.pageNumber = pageNumber;
    this.pageLimit = limit;
    this.competencyFrameworkContent = [];
    this.totalCount = 0;
    this.noResult = false;
    if (bothParams.queryParams.sort_by) {
      const sort_by = bothParams.queryParams.sort_by;
      const sortType = bothParams.queryParams.sortType;
      this.sort = {
        [sort_by]: _.toString(sortType)
      };
    } else {
      this.sort = { lastPublishedOn: 'desc' };
    }
    let statusFilter: string[] = [];
    if (this.isCompetencyFrameworkCreator) {
      statusFilter = ['Draft', 'Review', 'Live'];
    } else if (this.isCompetencyFrameworkReviewer) {
      statusFilter = ['Review'];
    } else {
      statusFilter = ['Draft', 'Review', 'Live'];
    }
    const searchParams = {
      filters: {
        status: statusFilter,
        objectType: 'Framework',
        type: 'K-12'
      },
      limit: limit,
      offset: (pageNumber - 1) * limit,
      query: _.toString(bothParams.queryParams.query),
      sort_by: this.sort
    };
    this.loaderMessage = {
      'loaderMessage': this.isCompetencyFrameworkReviewer 
        ? (this.resourceService.messages.stmsg.m0035 || 'Fetching competency frameworks for review...')
        : this.resourceService.messages.stmsg.m0021,
    };
    this.searchService.compositeSearch(searchParams).subscribe(
      (data: ServerResponse) => {
        if (data.result.count && data.result.Framework && data.result.Framework.length > 0) {
          this.competencyFrameworkContent = this.processFrameworkData(data.result.Framework);
          this.totalCount = data.result.count;
          this.pager = this.paginationService.getPager(data.result.count, pageNumber, limit);
          this.showLoader = false;
          this.noResult = false;
        } else {
          this.showError = false;
          this.noResult = true;
          this.showLoader = false;
          this.noResultMessage = {
            'message': this.isCompetencyFrameworkReviewer 
              ? (this.resourceService.messages.stmsg.m0035 || 'No competency frameworks found for review')
              : 'No competency frameworks found',
            'messageText': this.isCompetencyFrameworkReviewer
              ? (this.resourceService.messages.stmsg.m0007 || 'Please submit competency frameworks for review')
              : 'messages.stmsg.m0006'
          };
        }
      },
      (err: ServerResponse) => {
        this.showLoader = false;
        this.noResult = false;
        this.showError = true;
        this.toasterService.error(this.resourceService.messages.fmsg.m0051);
      }
    );
  }

  private processFrameworkData(frameworks: any[]): ICompetencyFrameworkContent[] {
    return frameworks.map(framework => ({
      identifier: framework.identifier,
      name: framework.name,
      code: framework.code,
      status: framework.status,
      lastUpdatedOn: framework.lastUpdatedOn,
      lastStatusChangedOn: framework.lastStatusChangedOn,
      description: framework.description,
      type: framework.type,
      objectType: framework.objectType,
      creator: framework.creator || framework.createdBy || '',
      createdBy: framework.createdBy || '',
      contentType: 'Competency Framework',
      primaryCategory: 'Competency Framework',
      mimeType: 'application/vnd.competency-framework+json',
      metaData: {
        identifier: framework.identifier,
        name: framework.name,
        code: framework.code,
        status: framework.status,
        lastUpdatedOn: framework.lastUpdatedOn,
        description: framework.description,
        type: framework.type,
        objectType: framework.objectType,
        mimeType: 'application/vnd.framework'
      }
    } as ICompetencyFrameworkContent));
  }

  public deleteConfirmModal(contentIds, mimeType) {
    this.currentContentId = contentIds;
    this.contentMimeType = mimeType;
    const config = new TemplateModalConfig<{ data: string }, string, string>(this.modalTemplate);
    config.isClosable = false;
    config.size = 'small';
    config.transitionDuration = 0;
    config.mustScroll = true;
    this.modalService.open(config);
    setTimeout(() => {
      let element = document.getElementsByTagName('sui-modal');
      if(element && element.length > 0)
        element[0].className = 'sb-modal';
    }, 10);
  }

  public checkLinkedCollections(modal) {
    if (!_.isUndefined(modal)) {
      modal.deny();
    }
    this.deleteContent(this.currentContentId);
  }

  private deleteContent(contentId: string) {
    const request = {
      contentIds: [contentId.toString()]
    };
    this.workSpaceService.deleteContent(request).subscribe(
      (data: ServerResponse) => {
        this.toasterService.success(this.resourceService.messages.smsg.m0006);
        this.fetchCompetencyFrameworkContent(this.config.appConfig.WORKSPACE.PAGE_LIMIT, this.pageNumber, { queryParams: this.queryParams });
      },
      (err: ServerResponse) => {
        this.toasterService.error(this.resourceService.messages.fmsg.m0051);
      }
    );
  }

  contentClick(content: ICompetencyFrameworkContent): void {
    if (this.isCompetencyFrameworkReviewer) {
      this.workSpaceService.openSkillMapEditor(content, 'review');
      return;
    }
    const status = content.status || (content.metaData && content.metaData.status);
    if (status === 'Live' || status === 'Review') {
      this.workSpaceService.navigateToContent(content, this.state);
    } else {
      this.toasterService.warning(this.resourceService.messages.imsg.m0027 || 'This competency framework cannot be viewed in current status');
    }
  }

  editCompetencyFramework(content: ICompetencyFrameworkContent): void {
    const status = content.status || (content.metaData && content.metaData.status);
    if (status === 'Live' || status === 'Review') {
      this.workSpaceService.openSkillMapEditor(content, this.state);
    } else {
      this.toasterService.warning(this.resourceService.messages.imsg.m0027 || 'This competency framework cannot be edited in current status');
    }
  }

  navigateToPage(page: number): undefined | void {
    if (page < 1 || page > this.pager.totalPages) {
      return;
    }
    this.pageNumber = page;
    const currentUrl = this.route.url;
    const routePath = currentUrl.includes('competencyframework-reviewer') ? 'competencyframework-reviewer' : 'competencyframework';
    this.route.navigate(['workspace/content/' + routePath, this.pageNumber], {
      queryParams: this.queryParams
    });
  }

  ngAfterViewInit () {
    this.telemetryImpression = {
      context: {
        env: this.activatedRoute.snapshot.data.telemetry.env
      },
      edata: {
        type: this.activatedRoute.snapshot.data.telemetry.type,
        pageid: this.activatedRoute.snapshot.data.telemetry.pageid,
        uri: this.activatedRoute.snapshot.data.telemetry.uri + '/' + this.activatedRoute.snapshot.params.pageNumber,
        subtype: this.activatedRoute.snapshot.data.telemetry.subtype
      }
    };
  }

  setInteractData(id) {
    return {
      id,
      type: 'click',
      pageid: 'workspace-content-competencyframework'
    };
  }
}
