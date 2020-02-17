package surveyKPI;

/*
This file is part of SMAP.

SMAP is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

SMAP is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

*/

import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.smap.sdal.Utilities.ApplicationException;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.SDDataSource;
import org.smap.sdal.Utilities.UtilityMethodsEmail;
import org.smap.sdal.managers.EmailManager;
import org.smap.sdal.managers.PeopleManager;
import org.smap.sdal.model.EmailServer;
import org.smap.sdal.model.OrganisationLite;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.sql.*;
import java.util.ArrayList;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.logging.Level;
import java.util.logging.Logger;

/*
 * Manage subscribers
 * This is closely related to the People service
 */
@Path("/subscriptions")
public class Subscriptions extends Application {

	private static Logger log =
			 Logger.getLogger(Subscriptions.class.getName());
	
	/*
	 * Unsubscribe
	 */
	@GET
	@Path("/unsubscribe/{token}")
	public Response unsubscribe(
			@Context HttpServletRequest request,
			@PathParam("token") String token) { 
		
		Response response = null;
		
		log.info("Unsubscribing user: " + token);
		
		Connection sd = SDDataSource.getConnection("surveyKPI-Register");
		
		PreparedStatement pstmt = null;
		try {
			
			// Localisation
			String hostname = request.getServerName();
			String loc_code = "en";
			if(hostname.contains("kontrolid")) {
				loc_code = "es";
			} 
			Locale locale = new Locale(loc_code);
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);		
			
			PeopleManager pm = new PeopleManager(localisation);
			pm.unsubscribe(sd, token);
			
			response = Response.ok().build();	
				
		} catch(ApplicationException e) {
			response = Response.serverError().entity(e.getMessage()).build();
		} catch(Exception e) {
			response = Response.serverError().entity(e.getMessage()).build();
			log.log(Level.SEVERE,"Error", e);
		} finally {
			SDDataSource.closeConnection("surveyKPI-Register", sd);
		}
		
		return response;
	}
	

	/*
	 * Subscribe Step 1
	 * Get an email
	 */
	@POST
	@Path("/subscribe")
	public Response subscribe(
			@Context HttpServletRequest request,
			@FormParam("email") String email,
			@FormParam("oId") int oId) { 
		
		Response response = null;
		String connectionString = "SurveyKPI - Post Subscribe";
		
		Connection sd = SDDataSource.getConnection(connectionString);
		
		// Start authorisation
		// An email must already exist for that organisation
		Authorise a = new Authorise(null, null);
		a.subscriptionExists(sd, oId, email);
		// End authorisation
		
		try {
			
			// Localisation
			String hostname = request.getServerName();
			String loc_code = "en";
			if(hostname.contains("kontrolid")) {
				loc_code = "es";
			} 
			Locale locale = new Locale(loc_code);
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);		
			
			PeopleManager pm = new PeopleManager(localisation);
			String key = pm.getSubscriptionKey(sd, oId, email);
			
			if(key != null) {
				// Update succeeded
				log.info("Sending email");
				
				EmailServer emailServer = UtilityMethodsEmail.getSmtpHost(sd, email, request.getRemoteUser());
				
				if(emailServer.smtpHost != null) {
				    
				    String subject = localisation.getString("c_s");
				    String sender = "subscribe";
				    EmailManager em = new EmailManager();
					em.sendEmail(email, null, "subscribe", subject, null, sender, null, null, 
				    		null, null, null, null, null, emailServer, 
				    		request.getScheme(),
				    		request.getServerName(),
				    		key,	// email key
				    		localisation,
				    		null,
				    		null);
				    response = Response.ok().build();
				} else {
					String msg = "Error password reset.  Email not enabled on this server.";
					log.info(msg);
					msg = localisation.getString("email_ne");
					response = Response.status(Status.NOT_FOUND).entity(msg).build();
				}
			} else {
				// email was not found 
				String msg = localisation.getString("email_nf") + " :" + email;
				log.info(msg);
				response = Response.status(Status.NOT_FOUND).entity(msg).build();
			}
			response = Response.ok().build();	
				
		} catch(ApplicationException e) {
			response = Response.serverError().entity(e.getMessage()).build();
		} catch(Exception e) {
			response = Response.serverError().entity(e.getMessage()).build();
			log.log(Level.SEVERE,"Error", e);
		} finally {
			SDDataSource.closeConnection(connectionString, sd);
		}
		
		return response;
	}
	
	/*
	 * Subscribe step 2
	 * Confirm the subscription by submitting a token
	 */
	@GET
	@Path("/subscribe/{token}")
	public Response subscribeStep2(
			@Context HttpServletRequest request,
			@PathParam("token") String token) { 
		
		Response response = null;
		
		log.info("Subscribing user: " + token);
		String connectionString = "surveyKPI-Subscribe Step 2";
		
		Connection sd = SDDataSource.getConnection(connectionString);
		
		PreparedStatement pstmt = null;
		try {
			
			// Localisation
			String hostname = request.getServerName();
			String loc_code = "en";
			if(hostname.contains("kontrolid")) {
				loc_code = "es";
			} 
			Locale locale = new Locale(loc_code);
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);		
			
			PeopleManager pm = new PeopleManager(localisation);
			pm.subscribeStep2(sd, token);
			
			response = Response.ok().build();	
				
		} catch(ApplicationException e) {
			response = Response.serverError().entity(e.getMessage()).build();
		} catch(Exception e) {
			response = Response.serverError().entity(e.getMessage()).build();
			log.log(Level.SEVERE,"Error", e);
		} finally {
			SDDataSource.closeConnection(connectionString, sd);
		}
		
		return response;
	}
	
	/*
	 * Validate an email when doing a self subscription
	 */
	@GET
	@Path("/validateEmail/{email}")
	public Response validateEmail(
			@Context HttpServletRequest request,
			@PathParam("email") String email) { 
		
		Response response = null;
		
		log.info("Validating email: " + email);
		String connectionString = "surveyKPI-Subscribe Validate Email";
		
		Connection sd = SDDataSource.getConnection(connectionString);
		
		PreparedStatement pstmt = null;
		try {
			
			// Localisation
			String hostname = request.getServerName();
			String loc_code = "en";
			if(hostname.contains("kontrolid")) {
				loc_code = "es";
			} 
			Locale locale = new Locale(loc_code);
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);		
			
			PeopleManager pm = new PeopleManager(localisation);
			ArrayList<OrganisationLite> oList = pm.getUnsubOrganisationsFromEmail(sd, email);
			Gson gson=  new GsonBuilder().disableHtmlEscaping().setDateFormat("yyyy-MM-dd HH:mm:ss").create();

			response = Response.ok(gson.toJson(oList)).build();	
				
		} catch(Exception e) {
			response = Response.serverError().entity(e.getMessage()).build();
			log.log(Level.SEVERE,"Error", e);
		} finally {
			SDDataSource.closeConnection(connectionString, sd);
		}
		
		return response;
	}

}

