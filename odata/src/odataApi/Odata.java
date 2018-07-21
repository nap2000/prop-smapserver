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
import org.smap.sdal.managers.EmailManager;

import data.PortalStorage;
import model.OdataEdmProvider;
import service.OdataEntityCollectionProcessor;
import service.OdataEntityProcessor;
import service.OdataPrimitiveProcessor;
import smapModels.PortalModel;

public class Odata extends HttpServlet {
	private static final long serialVersionUID = 1L;
	public static final String namespace = "OData.Smap";
	Authorise a = null;
	
	private static Logger log =
			Logger.getLogger(EmailManager.class.getName());

	public Odata () {
		ArrayList<String> authorisationsSuper = new ArrayList<String> ();	
		authorisationsSuper.add(Authorise.ANALYST);
		authorisationsSuper.add(Authorise.VIEW_DATA);
		authorisationsSuper.add(Authorise.ADMIN);
		a = new Authorise(authorisationsSuper, null);	
	}
	
	protected void service(final HttpServletRequest request, final HttpServletResponse response)
			throws ServletException, IOException {
		
		Connection sd = null;
		Connection cResults = null;
		String connectionString = "odata service";
		try {
			Locale locale = request.getLocale();
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);
			
			// Authorisation - Access
			sd = SDDataSource.getConnection(connectionString);
			a.isAuthorised(sd, request.getRemoteUser());
			// End authorisation

			/*
			 * Each end point will has its own container name
			 * These are defined as parameters in web.xml
			 * However all the servlets point to this class
			 */
			String servletPath = request.getServletPath();
			String container_name = servletPath.substring(1, servletPath.indexOf('.'));
			System.out.println("Container Name: " + container_name);
			
			/*
			 * TODO get the portal definition
			 * For now just retrieve all visible surveys
			 */
			// Create an internal model for the surveys that the user has access to
			cResults = ResultsDataSource.getConnection(connectionString);
			PortalModel surveyModel = new PortalModel(sd, cResults, localisation, locale, namespace,
					request.getRemoteUser(),
					GeneralUtilityMethods.getUrlPrefix(request));
			
			PortalStorage storage = new PortalStorage(sd, cResults, locale, localisation, surveyModel);	

			// create odata handler and configure it with CsdlEdmProvider and Processor
			OData odata = OData.newInstance();
			ServiceMetadata edm = odata.createServiceMetadata(new OdataEdmProvider(surveyModel, namespace,  container_name), 
					new ArrayList<EdmxReference>());
			
			ODataHttpHandler handler = odata.createHandler(edm);
			handler.register(new OdataEntityCollectionProcessor(storage));
			handler.register(new OdataEntityProcessor(storage));
			handler.register(new OdataPrimitiveProcessor(storage));

			// let the handler do the work
			handler.process(request, response);
		} catch (Exception e) {
			throw new ServletException(e);
		} finally {
			ResultsDataSource.closeConnection(connectionString, cResults);			
			SDDataSource.closeConnection(connectionString, sd);
		}
	}
}
