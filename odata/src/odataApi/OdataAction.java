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
import org.apache.olingo.server.api.edmx.EdmxReference;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.ResultsDataSource;
import org.smap.sdal.Utilities.SDDataSource;
import org.smap.sdal.managers.ActionManager;
import org.smap.sdal.managers.EmailManager;
import org.smap.sdal.model.Action;

import data.PortalStorage;
import model.OdataEdmProvider;
import service.OdataEntityCollectionProcessor;
import service.OdataEntityProcessor;
import service.OdataPrimitiveProcessor;
import smapModels.PortalModel;
import smapModels.ReportModel;

/*
 * Alows anonymous access to odata end point
 */
public class OdataAction extends HttpServlet {
	private static final long serialVersionUID = 1L;
	public static final String namespace = "OData.Smap";
	
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
			String urlPath = request.getRequestURL().toString().trim();
			if(urlPath.endsWith("/")) { // Remove any trailing slashes
				urlPath = urlPath.substring(0, urlPath.length() - 1);
			}
			String userIdent = urlPath.substring(urlPath.lastIndexOf('/') + 1);
			System.out.println("Action Name: " + userIdent);
			
			// 1. Get details on the action to be performed using the userIdent (Action Name)
			sd = SDDataSource.getConnection(connectionString);
			ActionManager am = new ActionManager();
			Action a = am.getAction(sd, userIdent);
			
			// 2. If temporary user does not exist then throw exception
			if (a == null) {
				throw new Exception(localisation.getString("mf_adnf"));
			}
			
			// Authorisation - Access Don't validate user rights as this is for an anonymous report
			auth.isValidSurvey(sd, userIdent, a.sId, false, false);
			// End Authorisation
						
			String container_name = a.name;		// Get from action
			
			// Create an internal model for the surveys that the user has access to
			cResults = ResultsDataSource.getConnection(connectionString);
			String basePath = GeneralUtilityMethods.getBasePath(request);	
			ReportModel reportModel = new ReportModel(sd, cResults, localisation, locale, namespace,
					a,
					request.getRemoteUser(),
					GeneralUtilityMethods.getUrlPrefix(request),
					basePath);
			
			System.out.println("Report Model created");
			//PortalStorage storage = new ReportStorage(sd, cResults, locale, localisation, a);	

			// create odata handler and configure it with CsdlEdmProvider and Processor
			//OData odata = OData.newInstance();
			//ServiceMetadata edm = odata.createServiceMetadata(new OdataEdmProvider(surveyModel, namespace,  container_name), 
			//		new ArrayList<EdmxReference>());
			
			//ODataHttpHandler handler = odata.createHandler(edm);
			//handler.register(new OdataEntityCollectionProcessor(storage));
			//handler.register(new OdataEntityProcessor(storage));
			//handler.register(new OdataPrimitiveProcessor(storage));

			// let the handler do the work
			//handler.process(request, response);
		} catch (Exception e) {
			throw new ServletException(e);
		} finally {
			ResultsDataSource.closeConnection(connectionString, cResults);			
			SDDataSource.closeConnection(connectionString, sd);
		}
	}
}
