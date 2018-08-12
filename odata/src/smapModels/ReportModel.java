package smapModels;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Locale;
import java.util.ResourceBundle;

import org.apache.olingo.commons.api.edm.FullQualifiedName;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.QueryGenerator;
import org.smap.sdal.constants.SmapExportTypes;
import org.smap.sdal.managers.QueryManager;
import org.smap.sdal.model.Action;
import org.smap.sdal.model.OptionDesc;
import org.smap.sdal.model.QueryForm;
import org.smap.sdal.model.SqlDesc;
import org.smap.sdal.model.TableColumn;

import util.Util;

public class ReportModel {

	Connection sd;
	Connection cResults;
	ResourceBundle localisation;
	Locale locale;
	String namespace;
	
	public String actionIdent;
	public Action action;
	public String user;						// User Ident
	public String urlprefix;					// Url prefix for images
	public String basePath;
	public SqlDesc sqlDesc;
	HashMap<ArrayList<OptionDesc>, String> labelListMap = new  HashMap<> ();
	
	public ReportModel(Connection sd, 
			Connection cResults,
			ResourceBundle localisation, 
			Locale locale, 
			String namespace, 
			Action action,
			String urlprefix,
			String basePath,
			String actionIdent) throws Exception {
		
		this.sd = sd;
		this.cResults = cResults;
		this.localisation = localisation;
		this.locale = locale;
		this.namespace = namespace;	
		this.action = action;
		this.urlprefix = urlprefix;
		this.basePath = basePath;
		this.actionIdent = actionIdent;
				
		/*
		 * Get the list of forms and surveys to be exported
		 */
		ArrayList<QueryForm> queryList = null;
		QueryManager qm = new QueryManager();	
		int fId = action.getFormId();
		queryList = qm.getFormList(sd, action.sId, fId);		// Get a form list for this survey / form combo

		QueryForm startingForm = qm.getQueryTree(sd, queryList);	// Convert the query list into a tree

		// Get the SQL for this query
		sqlDesc = QueryGenerator.gen(sd, 
				cResults,
				localisation,
				action.sId,
				fId,
				"none",						// Set language to none 
				SmapExportTypes.XLSX, 		// TODO
				urlprefix, 
				true,
				false,						// export read only
				false,						// excludeParents
				labelListMap,
				false,
				false,
				null,
				null,
				null,
				user,
				null,					// statDate
				null,					// endDate
				-1,						// dateId
				false,					// Super user - always apply filters
				startingForm,
				null,					// filter
				true,					// meta
				false);
	
	}
	
	
}
