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

public class PortalModel {

	Connection sd;
	Connection cResults;
	ResourceBundle localisation;
	Locale locale;
	String namespace;
	
	public String user;						// Survey Id
	public String urlprefix;					// Url prefix fo images
	public HashMap<String, SurveyForm> forms = new HashMap<> ();					// Forms keyed on their name
	public HashMap<FullQualifiedName, SurveyForm> fqnForms = new HashMap<> ();	// Forms keyed on the FQN of their entity type
	
	public PortalModel(Connection sd, 
			Connection cResults,
			ResourceBundle localisation, 
			Locale locale, 
			String namespace, 
			String user,
			String urlprefix) throws Exception {
		
		this.sd = sd;
		this.cResults = cResults;
		this.localisation = localisation;
		this.locale = locale;
		this.namespace = namespace;	
		this.user = user;
		this.urlprefix = urlprefix;
		
		
		getSurveys();
	}
	
	/*
	 * Get the survey details
	 */
	private void getSurveys() throws Exception {
		
		StringBuffer sql = new StringBuffer("select distinct s.s_id, s.display_name,  "
				+ "s.ident, s.managed_id, s.version, p.name, p.id "
				+ "from survey s, users u, user_project up, project p "
				+ "where u.id = up.u_id "
				+ "and p.id = up.p_id "
				+ "and s.p_id = up.p_id "
				+ "and p.o_id = u.o_id "
				+ "and u.ident = ? "
				+ "and s.hidden = 'false' "
				+ "and s.deleted = 'false'");
		
		sql.append(GeneralUtilityMethods.getSurveyRBAC());
		
		PreparedStatement pstmt = null;
		try {
			pstmt = sd.prepareStatement(sql.toString());
			pstmt.setString(1, user);
			pstmt.setString(2, user);		// RBAC
			ResultSet rs = pstmt.executeQuery();
			while (rs.next()) {
				SurveyModel sm = new SurveyModel();
				sm.id = rs.getInt("s_id");
				sm.ident = rs.getString("ident");
				sm.name = rs.getString("display_name");
				
				getForms(sm);
			}
			
		} finally {
			if(pstmt != null) {try {pstmt.close();}catch(Exception e) {}}
		}
	}
	
	private void getForms(SurveyModel sm) throws Exception {
		
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
			pstmt.setInt(1, sm.id);
			rs = pstmt.executeQuery();
			while (rs.next()) {
				
				SurveyForm f = new SurveyForm();
				
				f.id = rs.getInt("f_id");
				f.name = rs.getString("name");
				f.parentform = rs.getInt("parentform");
				if(f.parentform == 0) {		// Top level form
					f.name = sm.name;
				}
				f.parentQuestion = rs.getInt("parentquestion");
				f.tableName = rs.getString("table_name");
				
				// Add the columns
				f.columns = getColumns(sm.id, f.id, f.parentform, f.tableName);
				
				f.survey = sm;
				// Add the form to the hashmaps that reference it
				forms.put(f.name, f);
				FullQualifiedName fqn = new FullQualifiedName(namespace, Util.convertFormToEntityName(f.name));
				fqnForms.put(fqn, f);
				
			}
		} finally {
			if(pstmt != null) {try {pstmt.close();}catch(Exception e) {}}
		}
	}
	
	private ArrayList<TableColumn> getColumns(int sId, int fId, int parentform, String tableName) throws Exception {
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
				false,		// include survey duration
				false,
				false,		// TODO include HXL
				false		// Audit?
				);
	}
}
