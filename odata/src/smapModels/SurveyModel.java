package smapModels;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Locale;
import java.util.ResourceBundle;

import org.apache.olingo.commons.api.edm.FullQualifiedName;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.model.Form;
import org.smap.sdal.model.TableColumn;

import util.Util;

public class SurveyModel {

	Connection sd;
	Connection cResults;
	ResourceBundle localisation;
	Locale locale;
	String namespace;
	String user;
	
	public int sId;																// Survey Id
	public String surveyName;													// Survey Name
	public HashMap<String, SurveyForm> forms = new HashMap<> ();					// Forms keyed on their name
	public HashMap<FullQualifiedName, SurveyForm> fqnForms = new HashMap<> ();	// Forms keyed on the FQN of their entity type
	
	public SurveyModel(Connection sd, 
			Connection cResults,
			ResourceBundle localisation, 
			Locale locale, 
			int sId, 
			String namespace, 
			String user) throws Exception {
		
		this.sd = sd;
		this.cResults = cResults;
		this.localisation = localisation;
		this.locale = locale;
		this.sId = sId;
		this.namespace = namespace;	
		this.user = user;
		
		getSurvey();
		getForms();
	}
	
	/*
	 * Get the survey details
	 */
	private void getSurvey() throws SQLException {
		
		ResultSet rs = null;
		String sql = "select display_name "
				+ "from survey "
				+ "where s_id = ? ";
		
		PreparedStatement pstmt = null;
		try {
			pstmt = sd.prepareStatement(sql);
			pstmt.setInt(1, sId);
			rs = pstmt.executeQuery();
			if (rs.next()) {
				surveyName = rs.getString("display_name");
			}
		} finally {
			if(pstmt != null) {try {pstmt.close();}catch(Exception e) {}}
		}
	}
	
	private void getForms() throws Exception {
		
		ResultSet rs = null;
		String sql = "select f_id, "
				+ "name, "
				+ "parentform, "
				+ "parentquestion, "
				+ "table_name "
				+ "from form f "
				+ "where s_id = ? "
				+ "and not reference";
		PreparedStatement pstmt = null;
		
		try {
			pstmt = sd.prepareStatement(sql);
			pstmt.setInt(1, sId);
			rs = pstmt.executeQuery();
			while (rs.next()) {
				
				SurveyForm f = new SurveyForm();
				
				f.id = rs.getInt("f_id");
				f.name = rs.getString("name");
				f.parentform = rs.getInt("parentform");
				if(f.parentform == 0) {		// Top level form
					f.name = surveyName;
				}
				f.parentQuestion = rs.getInt("parentquestion");
				f.tableName = rs.getString("table_name");
				
				// Add the columns
				f.columns = getColumns(f.id, f.parentform, f.tableName);
				
				// Add the form to the hashmaps that reference it
				forms.put(f.name, f);
				FullQualifiedName fqn = new FullQualifiedName(namespace, Util.convertFormToEntityName(f.name));
				fqnForms.put(fqn, f);
				
			}
		} finally {
			if(pstmt != null) {try {pstmt.close();}catch(Exception e) {}}
		}
	}
	
	private ArrayList<TableColumn> getColumns(int fId, int parentform, String tableName) throws Exception {
		return GeneralUtilityMethods.getColumnsInForm(
				sd,
				cResults,
				localisation,
				"none",
				sId,
				user,
				parentform,
				fId,
				tableName,
				false,
				parentform != 0,	// Include parent key if the form is not the top level form
				false,		// don't include bad
				true,		// include instance id
				true,		// include other meta data
				true,		// include preloads
				true,		// include instancename
				true,		// include survey duration
				false,
				false,		// TODO include HXL
				false		// Audit?
				);
	}
}
