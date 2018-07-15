package smapModels;

import java.util.ArrayList;

import org.smap.sdal.model.TableColumn;

public class SurveyForm {
	public int id;
	public String name;
	public String referenceName;		// The name of the form that contains the data used by a reference form
	public int parentform;
	public int parentFormIndex;		// Used by the editor instead of the parent form id which may not be known during form creation
	public int parentQuestion;
	public int parentQuestionIndex;
	public String tableName;			// Name of the table that holds the results for this form
	public ArrayList<TableColumn> columns;

}
