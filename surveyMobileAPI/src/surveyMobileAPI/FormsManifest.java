/*****************************************************************************

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

 ******************************************************************************/

package surveyMobileAPI;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;

import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.SDDataSource;
import org.smap.sdal.managers.SurveyManager;
import org.smap.sdal.managers.TranslationManager;
import org.smap.sdal.model.ManifestValue;
import org.smap.sdal.model.Survey;
import org.apache.commons.codec.digest.*;



/*
 * Get manifests associated with the survey (ODK Format)
 * 
 */

@Path("/xformsManifest")
public class FormsManifest {

	Authorise a = new Authorise(null, Authorise.ENUM);
	
	private static Logger log =
			 Logger.getLogger(FormsManifest.class.getName());
	

	// Tell class loader about the root classes.  (needed as tomcat6 does not support servlet 3)
	public Set<Class<?>> getClasses() {
		Set<Class<?>> s = new HashSet<Class<?>>();
		s.add(FormXML.class);
		return s;
	}

	//@Context UriInfo uriInfo;

	// Respond with XML no matter what is requested
	@GET
	@Produces(MediaType.TEXT_XML)
	public String getManifest(
			@QueryParam("key") String key, 
			@Context HttpServletRequest request, 
			@Context HttpServletResponse resp) throws IOException {

		String host = request.getServerName();
		int portNumber = request.getLocalPort();
		String javaRosaVersion = request.getHeader("X-OpenRosa-Version");
		String protocol = "";
		StringBuilder responseStr = new StringBuilder();

		
		// Authorisation - Access
		Connection sd = SDDataSource.getConnection("surveyMobileAPI-FormsManifest");
		a.isAuthorised(sd, request.getRemoteUser());
		
		boolean superUser = false;
		ResourceBundle localisation = null;
		SurveyManager sm = null;
		Survey survey = null;
		
		try {
			superUser = GeneralUtilityMethods.isSuperUser(sd, request.getRemoteUser());
			// Get the users locale
			Locale locale = new Locale(GeneralUtilityMethods.getUserLanguage(sd, request, request.getRemoteUser()));
			localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);
			
			sm = new SurveyManager(localisation, "UTC");
			survey = sm.getSurveyId(sd, key);	// Get the survey id from the templateName / key
		} catch (Exception e) {
		}
		a.isValidSurvey(sd, request.getRemoteUser(), survey.id, false, superUser);	// Validate that the user can access this survey
		// End Authorisation
		
		if(portNumber == 443) {
			protocol = "https://";
		} else {
			protocol = "http://";
		}

		PreparedStatement pstmt = null;
		try {
			
			if(key == null) {
				throw new Exception("Error: Missing Parameter key");
			}			

			if(javaRosaVersion != null) {
				resp.setHeader("X-OpenRosa-Version", javaRosaVersion);
			} 

			responseStr.append("<manifest xmlns=\"http://openrosa.org/xforms/xformsManifest\">\n");

			/*
			 * Get the per-question and per-option media files from the translation table
			 */
 			String basepath = GeneralUtilityMethods.getBasePath(request);
			TranslationManager translationMgr = new TranslationManager();
			
			List<ManifestValue> manifestList = translationMgr.
					getManifestBySurvey(sd, request.getRemoteUser(), survey.id, basepath, key);

			String sIdent = GeneralUtilityMethods.getSurveyIdent(sd, survey.id);
			for( ManifestValue m : manifestList) {

				String filepath = null;

				if(m.type.equals("linked")) {
					filepath = basepath + "/media/" + sIdent+ "/" + m.fileName;
					filepath += ".csv";
					m.fileName += ".csv";
				} else {
					filepath = m.filePath;
				}
				
				// Check that the file exists
				if(filepath != null) {
					File f = new File(filepath);
					
					if(f.exists()) {
						// Get the MD5 hash
						String md5 = GeneralUtilityMethods.getMd5(filepath);
						
						String fullUrl = protocol + host + m.url;
		
						responseStr.append("<mediaFile>\n");
						responseStr.append("<filename>" + m.fileName + "</filename>\n");
						responseStr.append("<hash>" + md5 + "</hash>\n");
						responseStr.append("<downloadUrl>" + fullUrl + "</downloadUrl>\n");
						responseStr.append("</mediaFile>");
					} else {
						log.info("Error: " + filepath + " not found");
					}
				} else {
					log.info("Error: Manifest file path is null");
				}
					
			}
			responseStr.append("</manifest>\n");
			
		} catch (Exception e) {
			log.log(Level.SEVERE, e.getMessage(), e);
		} finally {
			try {if (pstmt != null) {pstmt.close();}} catch (SQLException e) {}
			
			SDDataSource.closeConnection("surveyMobileAPI-FormsManifest", sd);
		}		

		return responseStr.toString();
	}

}