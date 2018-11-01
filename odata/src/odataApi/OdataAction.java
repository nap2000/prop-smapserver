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

import org.apache.olingo.commons.api.edmx.EdmxReference;
import org.apache.olingo.server.api.OData;
import org.apache.olingo.server.api.ODataHttpHandler;
import org.apache.olingo.server.api.ServiceMetadata;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.ResultsDataSource;
import org.smap.sdal.Utilities.SDDataSource;
import org.smap.sdal.managers.ActionManager;
import org.smap.sdal.managers.EmailManager;
import org.smap.sdal.model.User;

import data.ReportStorage;
import model.OdataReportProvider;
import service.OdataReportEntityCollectionProcessor;
import smapModels.ReportModel;

/*
 * Allows anonymous access to odata end point
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

			// Authorisation - Access
			sd = SDDataSource.getConnection(connectionString);
			auth.isAuthorised(sd, request.getRemoteUser());
			// End authorisation
			
			String container_name = "reports";
			
			/*
			 * Get the available reports and create the odata model
			 */
			cResults = ResultsDataSource.getConnection(connectionString);
			String basePath = GeneralUtilityMethods.getBasePath(request);	
			int oId = GeneralUtilityMethods.getOrganisationId(sd, request.getRemoteUser(), 0);
			ActionManager am = new ActionManager();	
			ArrayList<User> tempUsers = am.getTemporaryUsers(sd, oId, "report", 0, 0);
			
			// Create an internal model for the surveys that the user has access to

			ReportModel reportModel = new ReportModel(sd, cResults, localisation, locale, namespace,
					tempUsers,
					GeneralUtilityMethods.getUrlPrefix(request),
					basePath);
			
			System.out.println("Report Model created");
			ReportStorage storage = new ReportStorage(sd, cResults, locale, localisation, reportModel);	

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
