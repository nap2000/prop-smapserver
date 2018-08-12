package odataApi;

import java.io.IOException;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.logging.Logger;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.olingo.server.api.OData;
import org.apache.olingo.server.api.ODataHttpHandler;
import org.apache.olingo.server.api.ServiceMetadata;
import org.apache.olingo.server.api.debug.DebugResponseHelper;
import org.apache.olingo.server.api.debug.DefaultDebugSupport;
import org.apache.olingo.server.api.edmx.EdmxReference;
import org.apache.olingo.server.core.debug.DebugResponseHelperImpl;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.ResultsDataSource;
import org.smap.sdal.Utilities.SDDataSource;
import org.smap.sdal.managers.ActionManager;
import org.smap.sdal.managers.EmailManager;
import org.smap.sdal.model.Action;

import data.PortalStorage;
import data.ReportStorage;
import model.OdataEdmProvider;
import model.OdataReportProvider;
import service.OdataEntityCollectionProcessor;
import service.OdataEntityProcessor;
import service.OdataPrimitiveProcessor;
import service.OdataReportEntityCollectionProcessor;
import smapModels.PortalModel;
import smapModels.ReportModel;

/*
 * Alows anonymous access to odata end point
 */
public class OdataAction extends HttpServlet {
	private static final long serialVersionUID = 1L;
	public static final String namespace = "ODataSmap";
	
	private static Logger log =
			Logger.getLogger(EmailManager.class.getName());

	Authorise auth = null;
	
	public OdataAction () {
		ArrayList<String> authorisations = new ArrayList<String>();
		authorisations.add(Authorise.ANALYST);
		authorisations.add(Authorise.MANAGE); // Enumerators with MANAGE access can process managed forms
		auth = new Authorise(authorisations, null);
	}
	
	protected void service(final HttpServletRequest request, final HttpServletResponse response)
			throws ServletException, IOException {
		
		Connection sd = null;
		Connection cResults = null;
		String connectionString = "odata action service";
		try {
			Locale locale = request.getLocale();
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);

			/*
			 * Get the key that identifies the action 
			 */
			String servletUrl = request.getServletPath();
			String urlPath = request.getRequestURL().toString().trim();
			if(urlPath.endsWith("/")) { // Remove any trailing slashes 
				urlPath = urlPath.substring(0, urlPath.length() - 1);
			}
			
			// Remove base path
			String entitySetName = urlPath.substring(urlPath.indexOf(servletUrl) + servletUrl.length() + 1);
			// Remove anything after the user ident
			int idx =  entitySetName.indexOf('/');
			if(idx > 0) {
				entitySetName = entitySetName.substring(0, entitySetName.indexOf('/'));
			}
			/*
			 * Odata does not support GUUIds as entitySet names hence the GUID in the URL has had it's dashes replaced by underscores
			 * Convert them back in order to look up the Action
			 */
			
			String actionIdent = entitySetName.replace('_', '-');
			// 1. Get details on the action to be performed using the userIdent (Action Name)
			sd = SDDataSource.getConnection(connectionString);
			ActionManager am = new ActionManager();
			Action a = am.getAction(sd, actionIdent);
			
			// 2. If the action details do not exist then throw exception
			if (a == null) {
				throw new Exception(localisation.getString("mf_adnf"));
			}
			
			// Authorisation - Access Don't validate user rights as this is for an anonymous report
			auth.isValidSurvey(sd, actionIdent, a.sId, false, false);
			// End Authorisation
				
			String container_name = a.name;		// report Name
			
			// Create an internal model for the surveys that the user has access to
			cResults = ResultsDataSource.getConnection(connectionString);
			String basePath = GeneralUtilityMethods.getBasePath(request);	
			ReportModel reportModel = new ReportModel(sd, cResults, localisation, locale, namespace,
					a,
					GeneralUtilityMethods.getUrlPrefix(request),
					basePath,
					entitySetName);
			
			System.out.println("Report Model created");
			ReportStorage storage = new ReportStorage(sd, cResults, locale, localisation, a, reportModel);	

			// create odata handler and configure it with CsdlEdmProvider and Processor
			OData odata = OData.newInstance();
			
			ServiceMetadata edm = odata.createServiceMetadata(new OdataReportProvider(reportModel, namespace,  container_name), 
					new ArrayList<EdmxReference>());
			
			ODataHttpHandler handler = odata.createHandler(edm);
			//handler.register(new DefaultDebugSupport());
			handler.register(new OdataReportEntityCollectionProcessor(storage));
			//handler.register(new OdataEntityProcessor(storage));
			//handler.register(new OdataPrimitiveProcessor(storage));

			// let the handler do the work
			System.out.println("URL:" + request.getRequestURI());
			handler.process(request, response);
		} catch (Exception e) {
			throw new ServletException(e);
		} finally {
			ResultsDataSource.closeConnection(connectionString, cResults);			
			SDDataSource.closeConnection(connectionString, sd);
		}
	}
}
