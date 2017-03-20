package org.smap.sdal.model;

public class ExportForm {
	public int sId;				// Passed by client
	public int fId;				// Passed by client
	public int fromQuestionId;	// Passed by client
	public int toQuestionId;	// Passed by client
	
	public String table;		// Temporary variable
	public int parent;			// Temporary variable
	public int surveyLevel;		// Temporary variable - set to 0 for the first survey encountered
	
	public ExportForm() {
		
	}
	
	public ExportForm(QueryForm qf) {
		sId = qf.survey;
		fId = qf.form;
	}
}
