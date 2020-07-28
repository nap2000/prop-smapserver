package reports;

import java.io.IOException;

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

import java.sql.Connection;
import java.util.ArrayList;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.ResultsDataSource;
import org.smap.sdal.Utilities.SDDataSource;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import data.DailyReportsManager;
import data.QrReportsManager;
import managers.ConfigManager;
import model.DailyReportsConfig;
import model.QrReportsConfig;
import model.ReportColumn;


@Path("/report/qr/{id}/word")
public class DailyReportWord extends Application {

	Authorise a = new Authorise(null, Authorise.ORG);

	private static Logger log =
			Logger.getLogger(DailyReportWord.class.getName());


	@GET
	@Produces("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	public Response getMonthly (@Context HttpServletRequest request,
			@PathParam("id") int id,
			@QueryParam("tz") String tz,
			@Context HttpServletResponse response) {

		Response responseVal = null;
		String connectionString = "tdh - QR report word";

		// Authorisation - Access
		Connection sd = SDDataSource.getConnection(connectionString);	
		a.isAuthorised(sd, request.getRemoteUser());		
		// End Authorisation 

		Connection cResults = null;
		try {
			Locale locale = new Locale(GeneralUtilityMethods.getUserLanguage(sd, request, request.getRemoteUser()));
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);

			Gson gson = new GsonBuilder().disableHtmlEscaping().setDateFormat("yyyy-MM-dd HH:mm:ss").create();
			cResults = ResultsDataSource.getConnection(connectionString);	
			
			ConfigManager cm = new ConfigManager(localisation);
			String configString = cm.getConfig(sd, id);
			
			// Dev
			QrReportsConfig q = new QrReportsConfig();
			q.sIdent= "s133_4081";
			q.columns = new ArrayList<ReportColumn> ();
			q.columns.add(new ReportColumn("class", "Class", 1, true));
			q.columns.add(new ReportColumn("class", "Class", 1, false));
			q.columns.add(new ReportColumn("gender", "Gender", 1, false));
			q.columns.add(new ReportColumn("q5", "Important", 1, false));
			configString = gson.toJson(q);
			// End dev
			
			if(configString != null) {			
				QrReportsConfig config = gson.fromJson(configString, QrReportsConfig.class);

				String filename = GeneralUtilityMethods.getSurveyNameFromIdent(sd, config.sIdent);
				QrReportsManager qrm = new QrReportsManager(localisation, tz);
				qrm.getQrReport(sd, cResults, response, filename, config);
				responseVal = Response.status(Status.OK).entity("").build();
			} else {
				responseVal = Response.status(Status.OK).entity("Error: Report not found").build();
			}

		}  catch (Exception e) {
			log.log(Level.SEVERE, "Exception", e);
			responseVal = Response.status(Status.OK).entity(e.getMessage()).build();
		} finally {

			SDDataSource.closeConnection(connectionString, sd);	

		}
		return responseVal;
	}


}
