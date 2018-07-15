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
import model.SurveyEdmProvider;
import service.DemoEntityCollectionProcessor;
import service.DemoEntityProcessor;
import service.DemoPrimitiveProcessor;
import service.SmapEntityCollectionProcessor;
import smapModels.SurveyModel;

public class Odata extends HttpServlet {
	private static final long serialVersionUID = 1L;
	public static final String namespace = "OData.Smap";
	Authorise a = null;

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
		String connectionString = "odata survey service";
		try {
			Locale locale = request.getLocale();
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);
			
			System.out.println("Session: " + request.getSession(false));
			System.out.println("Locale: " + locale.toString());
			String survey= request.getParameter("survey");	// Will be the container
			if(survey == null) {
				throw new ApplicationException(localisation.getString("odata_sns"));
			}
			
			// Authorisation - Access
			sd = SDDataSource.getConnection(connectionString);
			a.isAuthorised(sd, request.getRemoteUser());
			int sId = GeneralUtilityMethods.getSurveyId(sd, survey);
			if(sId == 0) {
				String msg = localisation.getString("odata_snf");
				msg = msg.replaceFirst("%s1", survey);
				throw new ApplicationException(msg);
			}
			a.isValidSurvey(sd, request.getRemoteUser(), sId, false, false);
			// End authorisation
			
			// Create an internal model for this survey 
			cResults = ResultsDataSource.getConnection(connectionString);
			SurveyModel surveyModel = new SurveyModel(sd, cResults, localisation, locale, sId, namespace,
					request.getRemoteUser());
			
			SurveyStorage storage = new SurveyStorage(surveyModel);	

			// create odata handler and configure it with CsdlEdmProvider and Processor
			OData odata = OData.newInstance();
			ServiceMetadata edm = odata.createServiceMetadata(new SurveyEdmProvider(surveyModel, namespace), 
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
