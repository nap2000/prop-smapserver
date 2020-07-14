package reports;



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
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.smap.sdal.Utilities.ApplicationException;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.ResultsDataSource;
import org.smap.sdal.Utilities.SDDataSource;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import data.DailyReportsManager;
import model.DailyReportsConfig;
import model.ReportMultiColumn;


@Path("/report/daily")
public class DailyReport extends Application {

	Authorise a = new Authorise(null, Authorise.ORG);

	private static Logger log =
			Logger.getLogger(DailyReport.class.getName());

	@GET
	@Path("/{id}/xls")
	//@Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	public Response getMonthly (@Context HttpServletRequest request,
			@PathParam("id") int id,
			@QueryParam("year") int year,
			@QueryParam("month") int month,
			@QueryParam("tz") String tz,
			@Context HttpServletResponse response) {

		String connectionString = "tdh - daily report - xls";
		Response responseVal = null;

		// Authorisation - Access
		Connection sd = SDDataSource.getConnection(connectionString);	
		a.isAuthorised(sd, request.getRemoteUser());
		a.isValidCustomReport(sd, request.getRemoteUser(), id);
		// End Authorisation 
		
		Connection cResults = null;
		PreparedStatement pstmt = null;
		try {
			Locale locale = new Locale(GeneralUtilityMethods.getUserLanguage(sd, request, request.getRemoteUser()));
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);

			if(month < 1 || month > 12) {
				throw new ApplicationException("Month must be specified and be between 1 and 12");
			}
			if(year == 0) {
				throw new ApplicationException("Year must be specified");
			}
			
			Gson gson = new GsonBuilder().disableHtmlEscaping().setDateFormat("yyyy-MM-dd HH:mm:ss").create();
			cResults = ResultsDataSource.getConnection(connectionString);	
			
			String sql = "select name, config, type_id, survey_ident "
					+ "from custom_report "
					+ "where id = ?";
			pstmt = sd.prepareStatement(sql);
			pstmt.setInt(1, id);
			ResultSet rs = pstmt.executeQuery();
			if(rs.next()) {
			
				DailyReportsConfig config = gson.fromJson(rs.getString("config"), DailyReportsConfig.class);
				
				// Develop
				//config.columns = new ArrayList<> ();
				//config.columns.add(new ReportColumn("date", "Date", 0));
				//config.columns.add(new ReportColumn("activity", "Activity", 0));
				//config.columns.add(new ReportColumn("activityintheday", "Activity for the day", 0));
	
				config.bars = new ArrayList<> ();
				ReportMultiColumn rmc = new ReportMultiColumn();
				rmc.name = "girls";
				rmc.title = "Girls";
				rmc.columns =  new ArrayList<> ();
				for(int i = 1; i < 12; i++) {
					rmc.columns.add("girls_" + i);
				}
				config.bars.add(rmc);
				rmc = new ReportMultiColumn();
				rmc.name = "boys";
				rmc.title = "Boys";
				rmc.columns =  new ArrayList<> ();
				for(int i = 1; i < 12; i++) {
					rmc.columns.add("boys_" + i);
				}
				config.bars.add(rmc);
				// End Develop
				
				String filename = GeneralUtilityMethods.getSurveyNameFromIdent(sd, config.sIdent);
				DailyReportsManager drm = new DailyReportsManager(localisation, tz);
				drm.getDailyReport(sd, cResults, response, filename, config, year, month);
				responseVal = Response.status(Status.OK).entity("").build();
			} else {
				responseVal = Response.status(Status.OK).entity("Error: Report not found").build();
			}
			
		}  catch (Exception e) {
			responseVal = Response.status(Status.OK).entity("Error: " + e.getMessage()).build();
			log.log(Level.SEVERE, "Exception", e);
		} finally {
			
			if(pstmt != null) {try{pstmt.close();}catch(Exception e) {}}
			SDDataSource.closeConnection(connectionString, sd);	
			ResultsDataSource.closeConnection(connectionString, cResults);	

		}
		return responseVal;
	}

}
