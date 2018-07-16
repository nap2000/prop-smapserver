package odataApi;

import java.io.IOException;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.olingo.commons.api.edm.FullQualifiedName;
import org.apache.olingo.server.api.OData;
import org.apache.olingo.server.api.ODataHttpHandler;
import org.apache.olingo.server.api.ServiceMetadata;
import org.apache.olingo.server.api.edmx.EdmxReference;
import org.smap.sdal.Utilities.ApplicationException;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.ResultsDataSource;
import org.smap.sdal.Utilities.SDDataSource;
import org.smap.sdal.managers.SurveyManager;

import data.SurveyStorage;
import model.DemoEdmProvider;
import model.OdataEdmProvider;
import service.DemoEntityCollectionProcessor;
import service.DemoEntityProcessor;
import service.DemoPrimitiveProcessor;
import service.SmapEntityCollectionProcessor;
import smapModels.PortalModel;

public class Odata1 extends HttpServlet {
	private static final long serialVersionUID = 1L;
	public static final String namespace = "OData.Smap";
	Authorise a = null;

	public Odata1 () {
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
			 * Each end point will have its own container name
			 * This end point is for Portal 1
			 * There will be a unique description for the contents of this portal view
			 */
			String container_name = "Portal1";
			
			/*
			 * TODO get the description of the portal
			 * For now just retrieve all visible surveys
			 */
			// Create an internal model for the surveys that the user has access to
			cResults = ResultsDataSource.getConnection(connectionString);
			PortalModel surveyModel = new PortalModel(sd, cResults, localisation, locale, namespace,
					request.getRemoteUser(),
					GeneralUtilityMethods.getUrlPrefix(request));
			
			SurveyStorage storage = new SurveyStorage(sd, cResults, locale, localisation, surveyModel);	

			// create odata handler and configure it with CsdlEdmProvider and Processor
			OData odata = OData.newInstance();
			ServiceMetadata edm = odata.createServiceMetadata(new OdataEdmProvider(surveyModel, namespace,  container_name), 
					new ArrayList<EdmxReference>());
			
			ODataHttpHandler handler = odata.createHandler(edm);
			handler.register(new SmapEntityCollectionProcessor(storage));
			//handler.register(new DemoEntityProcessor(storage));
			//handler.register(new DemoPrimitiveProcessor(storage));

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
