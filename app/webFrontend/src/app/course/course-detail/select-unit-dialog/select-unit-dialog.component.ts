import {Component, Inject, QueryList, ViewChildren, ViewEncapsulation} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef, MatSnackBar} from '@angular/material';
import {ICourse} from '../../../../../../../shared/models/ICourse';
import {SelectedUnitsService} from '../../../shared/services/selected-units.service';
import {LectureCheckboxComponent} from './lecture-checkbox/lecture-checkbox.component';
import {DownloadReq} from 'app/shared/services/data.service';

@Component({
  selector: 'app-select-unit-dialog',
  templateUrl: './select-unit-dialog.component.html',
  styleUrls: ['./select-unit-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SelectUnitDialogComponent {
  course: ICourse;
  chkbox: boolean;
  @ViewChildren(LectureCheckboxComponent)
  childLectures: QueryList<LectureCheckboxComponent>;

  constructor(public dialogRef: MatDialogRef<SelectUnitDialogComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any,
              private selectedUnitsService: SelectedUnitsService,
              private downloadReq: DownloadReq,
              public snackBar: MatSnackBar
              ) {
    this.course = data.course;
    this.chkbox = false;
  }

  onChange() {
    if (this.chkbox) {
      this.childLectures.forEach(lecture => {
        if (lecture.chkbox === false) {
          lecture.chkbox = true;
          lecture.onChange();
        }
      });
    } else {
      this.childLectures.forEach(lecture => lecture.chkbox = false);
      this.childLectures.forEach(unit => unit.onChange());
    }
  }

  async downloadAndClose() {
    console.log("Unitslength: " + this.selectedUnitsService.unitIds.length);
    if (this.selectedUnitsService.unitIds.length > 0) {
      const dl = {course: this.course.name, lectures: [], units: this.selectedUnitsService.getSelectedData()};
      console.log(dl.units.length + 'units Selected');
      const uri = '/api/uploads/' + await this.downloadReq.postDownloadReqForCourse(dl);
      console.log('Url:' + uri);
      this.downloadURI(uri, "Packed_Units_Lecture_" + this.course.name);
      this.dialogRef.close();
    } else {
      this.snackBar.open("Keine Units ausgewählt!",'Dismiss');
    }
  }

  downloadURI(uri, name) {
    var link = document.createElement("a");
    link.download = name;
    link.href = uri;
    link.click();
  }

}
