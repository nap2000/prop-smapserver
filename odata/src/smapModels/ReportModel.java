package smapModels;

import java.sql.Connection;
import java.sql.Date;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Locale;
import java.util.ResourceBundle;

import org.apache.olingo.commons.api.edm.FullQualifiedName;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.QueryGenerator;
import org.smap.sdal.constants.SmapExportTypes;
import org.smap.sdal.managers.ActionManager;
import org.smap.sdal.managers.QueryManager;
import org.smap.sdal.model.Action;
import org.smap.sdal.model.KeyValueSimp;
import org.smap.sdal.model.QueryForm;
import org.smap.sdal.model.User;

import util.Util;

public class ReportModel {

	Connection sd;
	Connection cResults;
	ResourceBundle localisation;
	Locale locale;
	String namespace;
	
	public String user;						// User Ident
	public String urlprefix;					// Url prefix for images
	public String basePath;
	public boolean odata2 = false;
	
	public HashMap<String, ReportDetails> reports = new HashMap<>();
	public HashMap<FullQualifiedName, ReportDetails> fqnReports = new HashMap<>();
	
	/*
	 * This model has to contain all of the possible reports that the user has access to
	 */
	public ReportModel(Connection sd, 
			Connection cResults,
			ResourceBundle localisation, 
			Locale locale, 
			String namespace, 
			String urlprefix,
			String basePath,
			String user) throws Exception {
		
		this.sd = sd;
		this.cResults = cResults;
		this.localisation = localisation;
		this.locale = locale;
		this.namespace = namespace;	
		this.urlprefix = urlprefix;
		this.basePath = basePath;
			
		String tz = "UTC";		// Default to UTC
		
		/*
		 * Get the list of forms and surveys to be exported
		 */
		ActionManager am = new ActionManager(localisation);	
		int oId = GeneralUtilityMethods.getOrganisationId(sd, user, 0);
		ArrayList<User> reportList  = am.getTemporaryUsers(sd, oId, "report", 0, 0);		// Should only be reports the user has access to
		for(User report : reportList) {
			Action action = am.getAction(sd, report.ident);
			String odataIdent = report.ident.replaceAll("-", "_");
			if(action != null) {
				
				ArrayList<QueryForm> queryList = null;
				QueryManager qm = new QueryManager();	
				
				int fId = 0;
				boolean split_locn = false;
				boolean merge_select_multiple = false;
				String language = "none";
				boolean exp_ro = false;
				boolean embedImages = false;
				boolean landscape = false;
				boolean excludeParents = false;
				boolean hxl = false;	
				Date startDate = null;
				Date endDate = null;	
				int dateId = 0;
				String filter = null;
				boolean meta = false;				// Done
				
				for(KeyValueSimp p : action.parameters) {
					if(p.k.equals("form")) {
						fId = Integer.parseInt(p.v);
					} else if(p.k.equals("split_locn")) {
						split_locn = Boolean.parseBoolean(p.v);
					} else if(p.k.equals("odata2")) {
						this.odata2 = true;
					} else if(p.k.equals("merge_select_multiple")) {
						merge_select_multiple = Boolean.parseBoolean(p.v);
					} else if(p.k.equals("language")) {
						language = p.v;
					} else if(p.k.equals("exp_ro")) {
						exp_ro = Boolean.parseBoolean(p.v);
					} else if(p.k.equals("embed_images")) {
						embedImages = Boolean.parseBoolean(p.v);
					} else if(p.k.equals("excludeParents")) {
						excludeParents = Boolean.parseBoolean(p.v);
					} else if(p.k.equals("hxl")) {
						hxl = Boolean.parseBoolean(p.v);
					} else if(p.k.equals("startDate")) {
						startDate = Date.valueOf(p.v);
					} else if(p.k.equals("endDate")) {
						endDate = Date.valueOf(p.v);
					} else if(p.k.equals("dateId")) {
						dateId = Integer.parseInt(p.v);
					} else if(p.k.equals("filter")) {
						filter = p.v;
					} else if(p.k.equals("meta")) {
						meta = Boolean.parseBoolean(p.v);
					} else if(p.k.equals("landscape")) {
						landscape = Boolean.parseBoolean(p.v);
					}
				}
				
				queryList = qm.getFormList(sd, action.sId, fId);		// Get a form list for this survey / form combo
	
				QueryForm startingForm = qm.getQueryTree(sd, queryList);	// Convert the query list into a tree
	
				// Get the SQL for this query
				ReportDetails rd = new ReportDetails();
				rd.entitySetName = odataIdent;
				rd.sqlDesc = QueryGenerator.gen(sd, 
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
						rd.labelListMap,
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
						meta,					// meta
						false,
						tz);
				reports.put(odataIdent, rd);
				
				FullQualifiedName fqn = new FullQualifiedName(namespace, Util.convertFormToEntityName(odataIdent));
				fqnReports.put(fqn, rd);
			}
		}
		
	
	}
	
	
}
